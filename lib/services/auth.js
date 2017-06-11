var passport = require('passport');
var i18n = require('i18n');
var logger = require('../services/logger');
var persistence = require('./persistence');
var oauth2orize = require('oauth2orize');
var uuid = require('uuid');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;

var server = oauth2orize.createServer();

passport.use(new BearerStrategy(function(token, cb) {
  persistence.findToken(token).then(function(token) {
    if(token === undefined || token === null)
      return cb(null, false);
    var user = token.User;
    cb(null, user);
    return user;
  }).catch(cb);
}));

passport.use(new LocalStrategy(function(username, password, done) {
  persistence.findUser(username).then(function(user) {
    if (!user)
       throw new Error(i18n.__("Bad credentials"));
    return user.verifyPassword(password).then(function(passwordValid){
      if(!passwordValid)
        throw new Error(i18n.__("Bad credentials"));
      done(null, user);
      return null;
    });
  }).catch(done);
}));

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
  persistence.findUser(username).then(function(user) {
    if (!user)
      throw new Error(i18n.__("Bad credentials"));
    return user.verifyPassword(password).then(function(passwordValid){
      if(!passwordValid)
        throw new Error(i18n.__("Bad credentials"));
    }).then(function() {
      var createToken = function(remainingAttempts){
        var accessToken = uuid.v4();
        return user.createToken({id: accessToken}).then(function(){
          done(null, accessToken);
        }).catch(function(err){
          logger.logException(err);
          remainingAttempts--;
          if(remainingAttempts > 0)
            return createToken(remainingAttempts);
          throw new Error(i18n.__("Cannot create token"));
        });
      };
      return createToken(5);
    });
  }).catch(done);
}));

var allowRegistration= function(){
  return JSON.parse(process.env.ALLOW_REGISTRATION || false);
};

var logout = function(token){
  return persistence.findToken(token).then(function(foundToken){
    if(foundToken === null || foundToken === undefined)
      throw new Error(i18n.__("Cannot delete non-existing token %s", token));
    return foundToken.destroy();
  });
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
