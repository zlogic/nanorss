var express = require('express');
var i18n = require('i18n');
var logger = require('../lib/services/logger');
var persistence = require('../lib/services/persistence');
var router = express.Router();

// TODO: add proper auth protection!
var allowModifications = function(){
  return JSON.parse(process.env.ALLOW_MODIFICATIONS || false);
};
if(!allowModifications()) {
  router.use(function(req, res, next) {
    throw new Error("Not authorized");
  });
}

/* GET user data. */
router.get('/', function(req, res, next) {
  persistence.getUserData().then(function(user){
    res.render('configuration', {
      title: i18n.__('nanoRSS configuration'),
      opml: user.opml,
      pagemonitor: user.pagemonitor
    });
  }).catch(next);
});


/* POST user data. */
router.post('/', function(req, res, next) {
  persistence.getUserData().then(function(user){
    for(var v in req.body)
      user.set(v, req.body[v]);
    return user.save();
  }).then(function(user){
    res.render('configuration', {
      title: i18n.__('nanoRSS configuration'),
      opml: user.opml,
      pagemonitor: user.pagemonitor
    });
  }).catch(next);
});

module.exports = router;
