var express = require('express');
var i18n = require('i18n');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: i18n.__('nanoRSS') });
});

module.exports = router;
