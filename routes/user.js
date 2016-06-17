var express = require('express');
var i18n = require('i18n');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger');
var pagemonitorConfiguration = require('../lib/pagemonitor/configuration');
var feedConfiguration = require('../lib/feed/configuration');
var Promise = require('bluebird').Promise;
var passport = require('passport');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* GET home page. */
router.get('/', function(req, res, next) {
  var processPagemonitorData = new Promise(function(resolve, reject){
    pagemonitorConfiguration.parseConfig(req.user.pagemonitor, function(err, pagemonitorconfiguration){
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
    feedConfiguration.parseGetUrlNames(req.user.opml, function(err, feedNames){
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
    res.render('user', {
      items: items
    });
  }).catch(function() {
    res.render('user', { items: [] });
  });
});

/* GET user data. */
router.get('/configuration', function(req, res, next) {
  res.send({
    username: req.user.username,
    opml: req.user.opml,
    pagemonitor: req.user.pagemonitor
  });
});

/* POST user data. */
router.post('/configuration', function(req, res, next) {
  persistence.getUserData().then(function(user){
    var password = req.body.password;
    for(var v in req.body)
      user.set(v, req.body[v]);
    return user.save();
  }).then(function(user){
    res.send({});
  }).catch(next);
});

/* Error handler */
router.use(function(err, req, res, next) {
  logger.logException(err);
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = router;
