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
    if(feedItem === undefined){
      var error = new Error('Item not found');
      error.status = 404;
      return next(error);
    }

    res.send(feedItem.contents);
  }).catch(next);
});

/* GET monitored page. */
router.get('/pagemonitor/:id', function(req, res, next) {
  var id = req.params.id;
  persistence.findPageMonitorItem(id).then(function(page){
    if(page === null){
      var error = new Error('Item not found');
      error.status = 404;
      return next(error);
    }

    var contents = (page.error !== undefined && page.error !== null) ? page.error : page.delta;
    res.send(contents.replace(/\n/g, '<br>\n'));
  }).catch(next);
});

module.exports = router;
