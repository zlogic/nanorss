var express = require('express');
var auth = require('../lib/services/auth');
var passport = require('passport');
var logger = require('../lib/services/logger');
var router = express.Router();

var errorLogger = function(err, req, res, next){
  logger.logException(err);
  next(err);
}

router.post('/user',
  passport.authenticate('bearer', { session: false }),
  auth.oauth2server.token(),
  errorLogger,
  auth.oauth2server.errorHandler());

router.post('/token',
  passport.authenticate('local', { session: false }),
  auth.oauth2server.token(),
  errorLogger,
  auth.oauth2server.errorHandler());

router.post('/logout', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  auth.logout(req.body.token).then(function(){
    res.send("");
  }).catch(next);
}, errorLogger, auth.oauth2server.errorHandler());

module.exports = router;
