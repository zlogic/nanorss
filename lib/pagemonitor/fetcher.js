var persistence = require('../services/persistence');
var i18n = require('i18n');
var parseString = require('xml2js').parseString;
var needle = require('needle');
var htmlToText = require('html-to-text');
var jsondiffpatch = require('jsondiffpatch');
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;
var Promise = require('bluebird').Promise;

var configXml = function(documentHandler){
  var username = "default";
  persistence.getUserData(username).then(function(user){
    parseString(user.pagemonitor, function(err, result){
      if (err) {
        return logException(err);
      }
      documentHandler(result);
    });
  }).catch(logException);
};

var comparePage = function(pageData, oldPage, newContents){
  var oldContents = oldPage !== null? oldPage.lastcontents : undefined;
  var pageRecord = {
    url: pageData.$.url,
    lastupdated: new Date(),
    lastcontents: newContents
  };
  var matchRegex = new RegExp(pageData.$.match !== undefined ? pageData.$.match:"", pageData.$.flags !== undefined ? pageData.$.flags:"");
  var replaceExpression = pageData.$.replace;
  if(oldContents === undefined){
    pageRecord.lastdelta = newContents.replace(matchRegex, replaceExpression);
    return persistence.savePageMonitorItem(pageRecord);
  } else {
    var oldContents = oldContents.replace(matchRegex, replaceExpression);
    var newContents = newContents.replace(matchRegex, replaceExpression);
    var delta = jsondiffpatch.diff(oldContents, newContents);
    pageRecord.lastdelta = delta;
    if(oldContents !== newContents)
      return persistence.savePageMonitorItem(pageRecord);
    return Promise.resolve();
  }
};

var updatePage = function(page){
  logger.verbose(i18n.__("Fetching page %s", page.$.url));
  needle.get(page.$.url, function(error, response) {
    if(error){
      return persistence.savePageMonitorItem({
        url: page.$.url,
        lastupdated: new Date(),
        lastcontents: error,
        lastdelta: error
      });
    } else {
      var newContents = htmlToText.fromString(response.body);
      return persistence.findPageMonitorItem(page.$.url).then(function(oldPage){
        return comparePage(page, oldPage, newContents);
      }).catch(logException);
    }
  });
};

var update = function(){
  configXml(function(pages){
    pages.pages.page.forEach(updatePage);
  });
};

module.exports.update = update;
