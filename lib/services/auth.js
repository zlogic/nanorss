var passport = require('passport');
var logger = require('../services/logger');
var persistence = require('./persistence');
var oauth2orize = require('oauth2orize');
var uuid = require('uuid');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;

var server = oauth2orize.createServer();

passport.use(new BearerStrategy(function(token, cb) {
  persistence.findUserByToken(token).then(function(user) {
    if(user === undefined)
      return cb(null, false);
    cb(null, user);
    return user;
  }).catch(cb);
}));

passport.use(new LocalStrategy(function(username, password, done) {
  persistence.findUser(username).then(function(user) {
    if (!user)
       throw new Error("Bad credentials");
    return user.verifyPassword(password).then(function(passwordValid){
      if(!passwordValid)
        throw new Error("Bad credentials");
      done(null, user);
      return null;
    });
  }).catch(done);
}));

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
  persistence.findUser(username).then(function(user) {
    if (!user)
      throw new Error("Bad credentials");
    return user.verifyPassword(password).then(function(passwordValid){
      if(!passwordValid)
        throw new Error("Bad credentials");
      return null;
    }).then(function() {
      var createToken = function(remainingAttempts){
        var accessToken = uuid.v4();
        return persistence.createUserToken(user.username, accessToken).then(function(){
          done(null, accessToken);
        }).catch(function(err){
          logger.logException(err);
          remainingAttempts--;
          if(remainingAttempts > 0)
            return createToken(remainingAttempts);
          throw new Error("Cannot create token");
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
  return persistence.deleteUserToken(token).then(function(user){
    if(user === undefined) {
      logger.logger.error("Cannot delete non-existing token %s", token);
      throw new Error("Cannot delete non-existing token");
    }
  });
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
