var express = require('express');
var i18n = require('i18n');
var persistence = require('../lib/services/persistence');
var Promise = require('bluebird').Promise;
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: i18n.__('nanoRSS')
  });
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

    var contents = (page.error !== undefined && page.error !== null) ? page.error : page.delta;
    res.render('item', {
      item: {
        date: page.updatedAt,
        contents: contents.replace(/\n/g, '<br>\n'),
        url: page.url
      }
    });
  }).catch(next);
});

module.exports = router;
