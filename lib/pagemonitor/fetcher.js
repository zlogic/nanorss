var persistence = require('../services/persistence');
var i18n = require('i18n');
var needle = require('needle');
var htmlToText = require('html-to-text');
var diff = require('diff');
var Promise = require('bluebird').Promise;
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;

var comparePage = function(pageMonitorItem, newContents){
  var oldContents = pageMonitorItem.contents;
  var applyRegex = function(contents){
    var matchRegex = (pageMonitorItem.match !== undefined && pageMonitorItem.match !== null) ? new RegExp(pageMonitorItem.match, pageMonitorItem.flags !== undefined ? pageMonitorItem.flags : "") : undefined;
    var replaceExpression = pageMonitorItem.replace;
    if(matchRegex === undefined || replaceExpression === undefined)
      return contents;
    return contents.replace(matchRegex, replaceExpression);
  };
  if(oldContents === undefined || oldContents === null)
    oldContents = "";
  else
    oldContents = applyRegex(oldContents);
  newContents = applyRegex(newContents);
  pageMonitorItem.contents = newContents;
  var delta = diff.createPatch(pageMonitorItem.url, oldContents+'\n', newContents+'\n');
  if(delta === undefined)
    delta = "";
  else
    delta = decodeURIComponent(delta.replace(/^([^\n]*\n){4}/,''));
  //Do not set delta to empty string if an error is resolved and page is unchanged
  if((pageMonitorItem.error === null || pageMonitorItem.error === undefined) && delta !== "")
    pageMonitorItem.delta = delta;
  if(oldContents !== newContents || (pageMonitorItem.error !== null && pageMonitorItem.error !== undefined)) {
    pageMonitorItem.error = null;
    return pageMonitorItem.save();
  }
  return Promise.resolve();
};

var updatePage = function(pageMonitorItem){
  logger.verbose(i18n.__("Fetching page %s", pageMonitorItem.url));
  return new Promise(function(resolve, reject){
    needle.get(pageMonitorItem.url, {parse_response: false}, function(error, response) {
      if(error){
        var errorString = i18n.__('Error when fetching page: %s', error.message);
        pageMonitorItem.error = errorString;
        return pageMonitorItem.save().then(resolve, reject);
      } else {
        var newContents = htmlToText.fromString(response.body);
        return comparePage(pageMonitorItem, newContents).then(resolve, reject);
      }
    });
  });
};

var cleanup = function(){
  return persistence.cleanupOrphanedPageMonitorItems().catch(logException);
};

var update = function(){
  return persistence.getPageMonitorItems().then(function(pageMonitorItems){
    return new Promise(function(resolve, reject){
      Promise.all(pageMonitorItems.map(function(pageMonitorItem){
        return updatePage(pageMonitorItem).catch(logException);
      })).then(resolve).catch(reject);
    });
  }).catch(logException);
};

module.exports.update = update;
module.exports.cleanup = cleanup;
