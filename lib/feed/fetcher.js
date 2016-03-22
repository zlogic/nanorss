var persistence = require('../services/persistence');
var configuration = require('./configuration');
var i18n = require('i18n');
var needle = require('needle');
var logger = require('../services/logger').logger;
var logException = require('../services/logger').logException;
var Promise = require('bluebird').Promise;

var configUrls = function(){
  return persistence.getUserData().then(function(user){
    return new Promise(function(resolve, reject){
      configuration.configXmlUrls(user.opml, function(err, result){
        if(err) return reject(err);
        resolve(result);
      });
    });
  }).catch(logException);
};

var parseFeed = function(feedXml){
  var parseRss = function(rss){
    if(rss.channel.item === undefined)
      return [];
    return rss.channel.item.map(function(item){
      var guid = item.guid !== undefined ? item.guid._ : item.link;
      return {
        guid: guid,
        title: item.title,
        url: item.link,
        date: new Date(item.pubDate),
        contents: item.description
      };
    });
  };
  var parseAtom = function(atom){
    //TODO
    return [];
  };
  if(feedXml.rss !== undefined)
    return parseRss(feedXml.rss);
  if(feedXml.feed !== undefined && feedXml.feed.$ !== undefined && feedXml.feed.$.xmlns === 'http://www.w3.org/2005/Atom')
    return parseAtom(feedXml.atom);
  //TODO: add rdf support
  throw new Error(i18n.__('Cannot parse feed:\n%s', JSON.stringify(feedXml)));
};

var fetchFeed = function(url){
  logger.verbose(i18n.__("Fetching feed %s", url));
  return new Promise(function(resolve, reject){
    needle.get(url, function(error, response) {
      if(error){
        logger.error(i18n.__("Error fetching feed %s", url));
        return reject(error);
      }
      try {
        var feedItems = parseFeed(response.body);
        persistence.saveFeed(url, feedItems).then(resolve, reject);
      } catch(err) {
        logger.error(i18n.__("Error parsing feed %s", url));
        return reject(err);
      }
    });
  });
};

var update = function(){
  configUrls().then(function(urls){
    urls.forEach(function(url){
      fetchFeed(url).catch(logException);
    });
  });
};

module.exports.update = update;
