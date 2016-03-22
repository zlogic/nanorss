var persistence = require('../services/persistence');
var configuration = require('./configuration');
var i18n = require('i18n');
var needle = require('needle');
var parseString = require('xml2js').parseString;
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

var parseFeed = function(feedXml, feedUrl){
  var getElementText = function(item){
    if(item === undefined || item[0] === undefined)
      return null;
    if(item[0]._ !== undefined)
      return item[0]._;
    return item[0];
  };
  var parseRss = function(rss){
    if(rss.channel[0].item === undefined)
      return [];
    return rss.channel[0].item.map(function(item, i){
      var guid = getElementText(item.guid);
      guid = guid !== null ? guid : getElementText(item.link);
      guid = feedUrl + '@@' + (guid !== null ? guid : i);
      var date = getElementText(item.pubDate);
      date = date !== null ? new Date(date) : new Date();
      return {
        guid: guid,
        title: getElementText(item.title),
        url: getElementText(item.link),
        date: date,
        contents: getElementText(item.description)
      };
    });
  };
  var parseAtom = function(atom){
    if(atom.entry === undefined)
      return [];
    return atom.entry.map(function(item, i){
      var url = item.link.find(function(link){
        return link.$ !== undefined && link.$.href !== undefined && (link.$.type === 'text/html' || link.$.type === undefined) && (link.$.rel === 'alternate' || link.$.type === undefined);
      });
      url = url !== undefined ? url.$.href : undefined;
      url = url !== undefined ? url : null;
      var guid = getElementText(item.guid);
      guid = guid !== null ? guid : url;
      guid = feedUrl + '@@' + (guid !== null ? guid : i);
      var contents = getElementText(item.content);
      contents = contents !== undefined ? contents : getElementText(item.summary);
      var date = getElementText(item.updated);
      date = date !== null ? new Date(date) : new Date();
      return {
        guid: guid,
        title: getElementText(item.title),
        url: url,
        date: date,
        contents: getElementText(item.summary)
      };
    });
  };
  var parseRDF = function(rdf){
    if(rdf.item === undefined)
      return [];
    return rdf.item.map(function(item, i){
      var guid = getElementText(item.link);
      guid = feedUrl + '@@' + (guid !== null ? guid : i);
      return {
        guid: guid,
        title: getElementText(item.title),
        url: getElementText(item.link),
        date: new Date(getElementText(item['dc:date'])),
        contents: getElementText(item.description)
      };
    });
  };
  if(feedXml.rss !== undefined)
    return parseRss(feedXml.rss);
  if(feedXml.feed !== undefined && feedXml.feed.$ !== undefined && feedXml.feed.$.xmlns === 'http://www.w3.org/2005/Atom')
    return parseAtom(feedXml.feed);
  if(feedXml['rdf:RDF'] !== undefined && feedXml['rdf:RDF'].$ !== undefined && feedXml['rdf:RDF'].$['xmlns:rdf'] === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
    return parseRDF(feedXml['rdf:RDF']); //TheOatmeal hack. RDF is terrible!
  throw new Error(i18n.__('Cannot parse feed:\n%s', JSON.stringify(feedXml)));
};

var fetchFeed = function(url){
  logger.verbose(i18n.__("Fetching feed %s", url));
  return new Promise(function(resolve, reject){
    needle.get(url, {parse_response: false}, function(error, response) {
      if(error){
        logger.error(i18n.__("Error fetching feed %s", url));
        return reject(error);
      }
      parseString(response.body, function(err, result){
        if(err)
          return reject(err);
        try {
          var feedItems = parseFeed(result, url);
          persistence.saveFeed(url, feedItems).then(resolve, reject);
        } catch(err) {
          logger.error(i18n.__("Error parsing feed %s", url));
          return reject(err);
        }
      });
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
