var express = require('express');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger');
var passport = require('passport');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* GET home page. */
router.get('/feed', async function(req, res, next) {
  try {
    var monitoredPages = persistence.getPageMonitorItems();
    var userFeeds = persistence.getUserFeeds();
    monitoredPages = await monitoredPages;
    userFeeds = await userFeeds;
    var items = monitoredPages.map(function(page){
      var pageTitle = page.title;
      return {
        sortBy: new Date(page.updatedAt).getTime(),
        title: pageTitle,
        origin: pageTitle,
        fetchUrl: 'pagemonitor/' + encodeURIComponent(page.id),
        url: page.url
      };
    });
    userFeeds.map(function(userFeed){
      return userFeed.Feed.FeedItems.map(function(feedItem) {
        return {
          sortBy: Math.min(new Date(feedItem.createdAt).getTime(), new Date(feedItem.date).getTime()),
          title: feedItem.title,
          origin: userFeed.title,
          fetchUrl: 'feeditem/' + feedItem.id,
          url: feedItem.url
        };
      });
    }).forEach(function(feedItems) {
      items = items.concat(feedItems);
    });
    items.sort(function(a, b){
      return b.sortBy - a.sortBy;
    });
    items.forEach(function(item){
      delete item.sortBy;
    });
    res.send(items);
  } catch(err) {
    next(err);
  }
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
router.post('/configuration', async function(req, res, next) {
  try {
    var user = await persistence.getUserData()
    var password = req.body.password;
    for(var v in req.body)
      user.set(v, req.body[v]);
    user = await user.save();
    res.send({});
  } catch(err) {
    next(err);
  }
});

/* Error handler */
router.use(function(err, req, res, next) {
  logger.logException(err);
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = router;
