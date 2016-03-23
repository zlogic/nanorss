var persistence = require('../services/persistence');
var configuration = require('./configuration');
var i18n = require('i18n');
var needle = require('needle');
var htmlToText = require('html-to-text');
var jsondiffpatch = require('jsondiffpatch');
var Promise = require('bluebird').Promise;
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;

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
  };
  if(oldContents === undefined || oldContents === null)
    oldContents = "";
  else
    oldContents = applyRegex(oldContents);
  newContents = applyRegex(newContents);
  var delta = jsondiffpatch.create({
    textDiff: { minLength: 1 }
  }).diff(oldContents, newContents);
  pageRecord.delta = decodeURIComponent(delta[0]);
  if(oldContents !== newContents)
    return persistence.savePageMonitorItem(pageRecord);
  return Promise.resolve();
};

var updatePage = function(page){
  logger.verbose(i18n.__("Fetching page %s", page.$.url));
  return new Promise(function(resolve, reject){
    needle.get(page.$.url, {parse_response: false}, function(error, response) {
      if(error){
        var errorString = i18n.__('Error when fetching page: %s', error.message);
        return persistence.savePageMonitorItem({
          url: page.$.url,
          contents: errorString,
          delta: errorString
        }).then(resolve, reject);
      } else {
        var newContents = htmlToText.fromString(response.body);
        return persistence.findPageMonitorItem(page.$.url).then(function(oldPage){
          return comparePage(page, oldPage, newContents);
        }).then(resolve, reject);
      }
    });
  });
};

var update = function(){
  return persistence.getUserData().then(function(user){
    return new Promise(function(resolve, reject){
      configuration.parseConfig(user.pagemonitor, function(err, pages){
        if(err){
          logException(err);
          return reject(err);
        }
        Promise.all(pages.pages.page.map(function(page){
          return updatePage(page).catch(logException);
        })).then(resolve).catch(reject);
      });
    });
  });
};

module.exports.update = update;
