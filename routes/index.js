var express = require('express');
var i18n = require('i18n');
var persistence = require('../lib/services/persistence');
var pagemonitorConfiguration = require('../lib/pagemonitor/configuration');
var Promise = require('bluebird').Promise;
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var processPagemonitorData = function(){
    return persistence.getUserData().then(function(user){
      return new Promise(function(resolve, reject){
        pagemonitorConfiguration.configXml(user.pagemonitor, function(err, pagemonitorconfiguration){
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
                date: page.updatedAt,
                sortBy: new Date(page.updatedAt).getTime(),
                title: pageTitle,
                contents: page.delta.replace(/\n/g, '<br>\n'),
                url: page.url
              };
            });
            return resolve(monitoredPagesItems);
          }).catch(reject);
        });
      });
    });
  };
  var processFeedData = function(){
    return persistence.getFeedItems().then(function(feedItems){
      return feedItems.map(function(feedItem){
        return {
          date: feedItem.date,
          sortBy: Math.min(new Date(feedItem.createdAt).getTime(), new Date(feedItem.date).getTime()),
          title: feedItem.title,
          contents: feedItem.contents,
          url: feedItem.url
        };
      })
    });
  };
  var items = [];
  processPagemonitorData().then(function(newItems){
    items = items.concat(newItems);
    return processFeedData();
  }).then(function(newItems){
    items = items.concat(newItems);
    items.sort(function(a, b){
      return b.sortBy - a.sortBy;
    })
    res.render('index', {
      title: i18n.__('nanoRSS'),
      items: items
    });
  }).catch(next);
});

module.exports = router;
