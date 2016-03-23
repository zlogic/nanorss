var persistence = require('../services/persistence');
var configuration = require('./configuration');
var i18n = require('i18n');
var needle = require('needle');
var htmlToText = require('html-to-text');
var jsondiffpatch = require('jsondiffpatch');
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;

var configXml = function(documentHandler){
  persistence.getUserData().then(function(user){
    configuration.configXml(user.pagemonitor, documentHandler);
  }).catch(logException);
};

var comparePage = function(pageData, oldPage, newContents){
  var oldContents = oldPage !== null? oldPage.contents : undefined;
  var pageRecord = {
    url: pageData.$.url,
    contents: newContents
  };
  var applyRegex = function(contents){
    var matchRegex = pageData.$.match !== undefined ? new RegExp(pageData.$.match, pageData.$.flags !== undefined ? pageData.$.flags : "") : undefined;
    var replaceExpression = pageData.$.replace;
    if(matchRegex === undefined || replaceExpression === undefined)
      return contents;
    return contents.replace(matchRegex, replaceExpression);
  }
  if(oldContents === undefined || oldContents === null){
    pageRecord.delta = applyRegex(newContents);
    return persistence.savePageMonitorItem(pageRecord);
  } else {
    oldContents = applyRegex(oldContents);
    newContents = applyRegex(newContents);
    var delta = jsondiffpatch.diff(oldContents, newContents);
    pageRecord.delta = delta;
    if(oldContents !== newContents)
      return persistence.savePageMonitorItem(pageRecord);
    return Promise.resolve();
  }
};

var updatePage = function(page){
  logger.verbose(i18n.__("Fetching page %s", page.$.url));
  needle.get(page.$.url, function(error, response) {
    if(error){
      var errorString = i18n.__('Error when fetching page: %s', error);
      return persistence.savePageMonitorItem({
        url: page.$.url,
        contents: errorString,
        delta: errorString
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
  configXml(function(err, pages){
    if(err)
      return logException(err);
    pages.pages.page.forEach(updatePage);
  });
};

module.exports.update = update;
