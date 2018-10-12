var passport = require('passport');
var logger = require('../services/logger');
var persistence = require('./persistence');
var oauth2orize = require('oauth2orize');
var uuid = require('uuid');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;

var server = oauth2orize.createServer();

passport.use(new BearerStrategy(async function(token, cb) {
  try {
    var token = await persistence.findToken(token)
    if(token === undefined || token === null)
      return cb(null, false);
    var user = token.User;
    cb(null, user);
    return user;
  } catch(err) {
    cb(err);
  }
}));

passport.use(new LocalStrategy(async function(username, password, done) {
  try {
    var user = await persistence.findUser(username);
    if (!user)
       throw new Error("Bad credentials");
    var passwordValid = await user.verifyPassword(password);
    if(!passwordValid)
      throw new Error("Bad credentials");
    done(null, user);
  } catch(err) {
    done(err);
  }
}));

server.exchange(oauth2orize.exchange.password(async function(client, username, password, scope, done) {
  try {
    var user = await persistence.findUser(username);
    if (!user)
      throw new Error("Bad credentials");
    var passwordValid = await user.verifyPassword(password);
    if(!passwordValid)
      throw new Error("Bad credentials");
    var createToken = async function(remainingAttempts){
      var accessToken = uuid.v4();
      try {
        await user.createToken({id: accessToken})
        done(null, accessToken);
      } catch(err) {
        logger.logException(err);
        remainingAttempts--;
        if(remainingAttempts > 0)
          return createToken(remainingAttempts);
        throw new Error("Cannot create token");
      }
    };
    await createToken(5);
  } catch(err) {
    done(err);
  };
}));

var allowRegistration= function(){
  return JSON.parse(process.env.ALLOW_REGISTRATION || false);
};

var logout = async function(token){
  var foundToken = await persistence.findToken(token);
  if(foundToken === null || foundToken === undefined) {
    logger.logger.error("Cannot delete non-existing token %s", token);
    throw new Error("Cannot delete non-existing token");
  }
  return foundToken.destroy();
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
