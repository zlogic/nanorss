var express = require('express');
var i18n = require('i18n');
var persistence = require('../lib/services/persistence');
var pagemonitorConfiguration = require('../lib/pagemonitor/configuration');
var feedConfiguration = require('../lib/feed/configuration');
var Promise = require('bluebird').Promise;
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  persistence.getUserData().then(function(user){
    var processPagemonitorData = new Promise(function(resolve, reject){
      pagemonitorConfiguration.parseConfig(user.pagemonitor, function(err, pagemonitorconfiguration){
        if(err)
          return reject(err);
        var findPageMonitorConfiguration = function(url){
          return pagemonitorconfiguration.pages.page.find(function(page){
            return page.$.url === url;
          });
        };
        persistence.getPageMonitorItems().then(function(monitoredPages){
          var monitoredPagesItems = monitoredPages.map(function(page){
            var pageMonitorConfiguration = findPageMonitorConfiguration(page.url);
            var pageTitle = (pageMonitorConfiguration !== undefined )? pageMonitorConfiguration._ : undefined;
            return {
              sortBy: new Date(page.updatedAt).getTime(),
              title: pageTitle,
              origin: pageTitle,
              fetchUrl: 'pagemonitor/' + encodeURIComponent(page.id),
              url: page.url
            };
          });
          resolve(monitoredPagesItems);
        }).catch(reject);
      });
    });
    var processFeedData = new Promise(function(resolve, reject){
      feedConfiguration.parseGetUrlNames(user.opml, function(err, feedNames){
        if(err)
          return reject(err);
        persistence.getFeedItems().then(function(feedItems){
          var feedItems = feedItems.map(function(feedItem){
            var feedName = feedNames[feedItem.Feed.url];
            if(feedName === undefined)
              return undefined;
            return {
              sortBy: Math.min(new Date(feedItem.createdAt).getTime(), new Date(feedItem.date).getTime()),
              title: feedItem.title,
              origin: feedName,
              fetchUrl: 'feeditem/' + feedItem.id,
              url: feedItem.url
            };
          }).filter(function(feedItem){ return feedItem !== undefined;});
          resolve(feedItems);
        }).catch(reject);
      });
    });
    return Promise.all([processPagemonitorData, processFeedData]).then(function(items){
      items = items.reduce(function(a, b){
        return a.concat(b);
      }, []);
      items.sort(function(a, b){
        return b.sortBy - a.sortBy;
      });
      res.render('index', {
        title: i18n.__('nanoRSS'),
        items: items
      });
    });
  }).catch(next);
});

/* GET feed item. */
router.get('/feeditem/:id', function(req, res, next) {
  var id = req.params.id;
  persistence.findFeedItem(id).then(function(feedItem){
    if(feedItem === null)
      return next(new Error(i18n.__('Item %s not found', id)));

    res.render('item', {
      item: {
        date: feedItem.date,
        contents: feedItem.contents,
        url: feedItem.url
      }
    });
  }).catch(next);
});

/* GET monitored page. */
router.get('/pagemonitor/:id', function(req, res, next) {
  var id = req.params.id;
  persistence.findPageMonitorItem(id).then(function(page){
    if(page === null)
      return next(new Error(i18n.__('Item %s not found', id)));

    res.render('item', {
      item: {
        date: page.updatedAt,
        contents: page.delta.replace(/\n/g, '<br>\n'),
        url: page.url
      }
    });
  }).catch(next);
});

module.exports = router;
