var persistence = require('../services/persistence');
var configuration = require('./configuration');
var i18n = require('i18n');
var needle = require('needle');
var htmlToText = require('html-to-text');
var jsondiffpatch = require('jsondiffpatch');
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;
var Promise = require('bluebird').Promise;

var configXml = function(documentHandler){
  persistence.getUserData().then(function(user){
    configuration.configXml(user.pagemonitor, documentHandler);
  }).catch(logException);
};

var comparePage = function(pageData, oldPage, newContents){
  var oldContents = oldPage !== null? oldPage.contents : undefined;
  var pageRecord = {
    url: pageData.$.url,
    updated: new Date(),
    contents: newContents
  };
  var matchRegex = new RegExp(pageData.$.match !== undefined ? pageData.$.match:"", pageData.$.flags !== undefined ? pageData.$.flags:"");
  var replaceExpression = pageData.$.replace;
  if(oldContents === undefined){
    pageRecord.delta = newContents.replace(matchRegex, replaceExpression);
    return persistence.savePageMonitorItem(pageRecord);
  } else {
    oldContents = oldContents.replace(matchRegex, replaceExpression);
    newContents = newContents.replace(matchRegex, replaceExpression);
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
      return persistence.savePageMonitorItem({
        url: page.$.url,
        updated: new Date(),
        contents: error,
        delta: error
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
