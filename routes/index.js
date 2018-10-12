var express = require('express');
var persistence = require('../lib/services/persistence');
var path = require('path');
var router = express.Router();

/* GET home page. */
router.get(['/', '/login', '/feed', '/configuration'], function(req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'dist', 'nanorss', 'index.html'));
});

/* GET feed item. */
router.get('/feeditem/:id', async function(req, res, next) {
  var id = req.params.id;
  try {
    var feedItem = await persistence.findFeedItem(id);
    if(feedItem === null){
      var error = new Error('Item not found');
      error.status = 404;
      return next(error);
    }
    res.send(feedItem.contents);
  } catch(err) {
    next(err);
  }
});

/* GET monitored page. */
router.get('/pagemonitor/:id', async function(req, res, next) {
  var id = req.params.id;
  try {
    var page = await persistence.findPageMonitorItem(id);
    if(page === null){
      var error = new Error('Item not found');
      error.status = 404;
      return next(error);
    }

    var contents;
    if(page.error !== undefined && page.error !== null)
      contents = page.error;
    else if(page.delta !== undefined && page.delta !== null)
      contents = page.delta;
    else
      contents = "";

    res.send(contents.replace(/\n/g, '<br>\n'));
  } catch(err) {
    next(err);
  }
});

module.exports = router;
