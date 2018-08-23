var express = require('express');
var persistence = require('../lib/services/persistence');
var Promise = require('bluebird').Promise;
var path = require('path');
var router = express.Router();

/* GET home page. */
router.get(['/', '/login', '/feed', '/configuration'], function(req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'dist', 'nanorss', 'index.html'));
});

/* GET feed item. */
router.get('/feeditem/:id', function(req, res, next) {
  var id = req.params.id;
  persistence.findFeedItem(id).then(function(feedItem){
    if(feedItem === null)
      return next(new Error('Item not found'));

    res.send(feedItem.contents);
  }).catch(next);
});

/* GET monitored page. */
router.get('/pagemonitor/:id', function(req, res, next) {
  var id = req.params.id;
  persistence.findPageMonitorItem(id).then(function(page){
    if(page === null)
      return next(new Error('Item not found'));

    var contents = (page.error !== undefined && page.error !== null) ? page.error : page.delta;
    res.send(contents.replace(/\n/g, '<br>\n'));
  }).catch(next);
});

module.exports = router;
