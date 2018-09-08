var express = require('express');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger');
var passport = require('passport');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* GET home page. */
router.get('/feed', function(req, res, next) {
  var processPagemonitorData = persistence.getPageMonitorItems().then(function(monitoredPages){
    var monitoredPagesItems = monitoredPages.map(function(page){
      var pageTitle = page.title;
      return {
        sortBy: new Date(page.updatedAt).getTime(),
        title: pageTitle,
        origin: pageTitle,
        fetchUrl: 'pagemonitor/' + page._id,
        url: page.url
      };
    });
    return monitoredPagesItems;
  });
  var processFeedData = persistence.getUserFeeds().then(function(userFeeds){
    return userFeeds.map(function(userFeed){
      return userFeed.feed.items.map(function(feedItem) {
        return {
          sortBy: Math.min(new Date(feedItem.lastSeen).getTime(), new Date(feedItem.date).getTime()),
          title: feedItem.title,
          origin: userFeed.title,
          fetchUrl: 'feeditem/' + feedItem._id,
          url: feedItem.url
        };
      });
    }).reduce(function(a, b) {
      return a.concat(b);
    });
  });
  return Promise.all([processPagemonitorData, processFeedData]).then(function(items){
    items = items.reduce(function(a, b){
      return a.concat(b);
    }, []);
    items.sort(function(a, b){
      return b.sortBy - a.sortBy;
    });
    items.forEach(function(item){
      delete item.sortBy;
    });
    res.send(items);
  }).catch(next);
});

/* GET user data. */
router.get('/configuration', function(req, res, next) {
  persistence.getUserData().then(function(user){
    res.send({
      username: user.username,
      opml: user.opml,
      pagemonitor: user.pagemonitor
    });
  });
});

/* POST user data. */
router.post('/configuration', function(req, res, next) {
  persistence.getUserData().then(function(user){
    if(req.body.username !== undefined)
      user.username = req.body.username;
    if(req.body.password !== undefined)
      user.password = req.body.password;
    if(req.body.opml !== undefined)
      user.opml = req.body.opml;
    if(req.body.pagemonitor !== undefined)
      user.pagemonitor = req.body.pagemonitor;
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
