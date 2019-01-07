var persistence = require('../services/persistence');
var needle = require('needle');
var htmlToText = require('html-to-text');
var diff = require('diff');
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;

var comparePage = async function(pageMonitorItem, newContents){
  var oldContents = pageMonitorItem.contents;
  var applyRegex = function(contents){
    var matchRegex = (pageMonitorItem.match !== undefined && pageMonitorItem.match !== null) ? new RegExp(pageMonitorItem.match, pageMonitorItem.flags !== undefined && pageMonitorItem.flags !== null ? pageMonitorItem.flags : "") : undefined;
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
    delta = delta.replace(/^([^\n]*\n){4}/,'');
  //Do not set delta to empty string if an error is resolved and page is unchanged
  if((pageMonitorItem.error === null || pageMonitorItem.error === undefined) && delta !== "")
    pageMonitorItem.delta = delta;
  if(oldContents !== newContents || (pageMonitorItem.error !== null && pageMonitorItem.error !== undefined)) {
    pageMonitorItem.error = null;
    return pageMonitorItem.save();
  }
};

var updatePage = async function(pageMonitorItem){
  logger.verbose("Fetching page %s", pageMonitorItem.url);
  try {
    var response = await needle('get', pageMonitorItem.url, {parse_response: false});
    var newContents = htmlToText.fromString(response.body);
    return comparePage(pageMonitorItem, newContents);
  } catch(err) {
    //TODO: store error in a separate field? This cannot be localized.
    var errorString = 'Error when fetching page: ' + err.message;
    logger.error("Error fetching page %s", pageMonitorItem.url);
    pageMonitorItem.error = errorString;
    try {
      await pageMonitorItem.save();
    } catch(saveErr) {
      throw saveErr;
    }
    throw err;
  }
};

var cleanup = async function(){
  try {
    await persistence.cleanupOrphanedPageMonitorItems();
  } catch(err) {
    logException(err);
  }
};

var update = async function() {
  try {
    var pageMonitorItems = await persistence.getPageMonitorItems();
    await Promise.all(pageMonitorItems.map(function(pageMonitorItem){
      return updatePage(pageMonitorItem).catch(logException);
    }));
  } catch(err) {
    logException(err);
  }
};

module.exports.update = update;
module.exports.cleanup = cleanup;
