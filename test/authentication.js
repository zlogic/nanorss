var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var persistence = require('../lib/services/persistence');
var persistencehooks = require('./utils/persistencehooks');
var superagent = require('superagent');
var uuid = require('uuid/v4');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

var prepopulate = function() {
  return persistence.getUserData().then(function(user){
    user.password = "pass";
    return user.save();
  })
};

describe('Service', function() {
  serviceBase.hooks();

  persistencehooks.hooks();

  afterEach(function() {
    delete process.env.TOKEN_EXPIRES_DAYS;
  });

  var oneSecond = 1 / (24 * 60 * 60);

  describe('authentication', function () {
    it('should accept authentication of a valid user', function (done) {
      var userData = {username: "default", password: "pass"};
      prepopulate().then(function(user){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
          } catch(err) {done(err);}
          persistence.getUserTokens().then(function(tokens){
            assert.equal(tokens.length, 1);
            assert.equal(tokens[0].token, token);
            done();
          }).catch(done);
        });
      }).catch(done);
    });
    it('should delete authentication of a valid user on logout', function (done) {
      var userData = {username: "default", password: "pass"};
      prepopulate().then(function(user){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
          } catch(err) {done(err);}
            persistence.getUserTokens().then(function(tokens){
              assert.equal(tokens.length, 1);
              assert.equal(tokens[0].token, token);
              superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token).end(function(err, result){
                if(err) return done(err);
                try {
                  assert.ok(result);
                  assert.equal(result.status, 200);
                  assert.equal(result.text, "");
                  persistence.getUserTokens().then(function(tokens){
                    assert.deepEqual(tokens.toObject(), []);
                    done();
                  }).catch(done);
                } catch(err) {done(err);}
            });
          }).catch(done);
        });
        return user;
      }).catch(done);
    });
    it('should reject authentication for expired tokens', function (done) {
      this.timeout(4000);
      var userData = {username: "default", password: "pass"};
      process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
      prepopulate().then(function(user){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
            persistence.getUserTokens().then(function(tokens){
              assert.equal(tokens.length, 1);
              assert.equal(tokens[0].token, token);
              setTimeout(function(){
                superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token).end(function(err, result){
                  try {
                    assert.ok(err);
                    assert.equal(result.status, 401);
                    assert.equal(result.text, "Unauthorized");
                    persistence.getUserTokens().then(function(tokens){
                      assert.deepEqual(tokens.toObject(), []);
                      done();
                    }).catch(done);
                  } catch(err) {done(err);}
                });
              }, 1000);
            }).catch(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should perform maintenance of expired tokens by deleting them', function (done) {
      this.timeout(4000);
      var userData = {username: "default", password: "pass"};
      process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
      prepopulate().then(function(user){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
            persistence.getUserTokens().then(function(tokens){
              assert.equal(tokens.length, 1);
              assert.equal(tokens[0].token, token);
              setTimeout(function(){
                persistence.cleanupExpiredTokens().then(function(){
                  return persistence.getUserTokens().then(function(tokens){
                    assert.deepEqual(tokens.toObject(), []);
                    done();
                  });
                }).catch(done);
              }, 1000);
            }).catch(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should retry token generation in case a generated token uuid is already in use', function (testDone) {
      var userData = {username: "default", password: "pass"};
      var defaultGenerator = uuid.v4;
      var done = function (err) {
        uuid.v4 = defaultGenerator;
        return testDone(err);
      };
      var generatorPattern = {1: "1", 2: "1", 3:"1", 4: "1", 5: "1", 6: "2"};
      var generatorCounter = 0;
      var brokenGenerator = function(){
        generatorCounter++;
        return generatorPattern[generatorCounter] || generatorCounter;
      };
      prepopulate().then(function(user){
        uuid.v4 = brokenGenerator;
        authenticateUser(userData, function(err, token1, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.equal(token1, "1");
            authenticateUser(userData, function(err, token2, result){
              if(err) return done(err);
              try {
                assert.equal(result.status, 200);
                assert.equal(token2, "2");
                assert.equal(generatorCounter, 6);
                return persistence.getUserTokens().then(function(tokens){
                  assert.equal(tokens.length, 2);
                  assert.equal(tokens[0].token, "1");
                  assert.equal(tokens[1].token, "2");
                  done();
                });
              } catch(err) {done(err);}
            });
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should give up retrying token generation in case a generated token uuid is already in use if number of attempts is exceeded', function (testDone) {
      this.timeout(10000);
      var userData = {username: "default", password: "pass"};
      var defaultGenerator = uuid.v4;
      var done = function (err) {
        uuid.v4 = defaultGenerator;
        return testDone(err);
      };
      var generatorCounter = 0;
      var brokenGenerator = function(){
        generatorCounter++;
        return "1";
      };
      prepopulate().then(function(user){
        uuid.v4 = brokenGenerator;
        authenticateUser(userData, function(err, token1, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.equal(token1, "1");
            authenticateUser(userData, function(err, token2, result){
              try {
                assert.ok(err);
                assert.equal(err.status, 500);
                assert.equal(!!token2, false);
                assert.equal(generatorCounter, 1 + 5);
                assert.deepEqual(err.response.body, {error:"server_error", error_description:"Cannot create token"});
                return persistence.getUserTokens().then(function(tokens){
                  assert.equal(tokens.length, 1);
                  assert.equal(tokens[0].token, "1");
                  done();
                });
              } catch(err) {done(err);}
            });
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should reject authentication of an invalid user', function (done) {
      var userData = {username: "default", password: "badpassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 500);
            assert.equal(err.response.body.error_description, 'Bad credentials');
            assert.equal(!!token, false);
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should reject logout for a non-existing token', function (done) {
      var userData = {username: "default", password: "pass"};
      prepopulate().then(function(user){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
          } catch(err) {done(err);}
          persistence.getUserTokens().then(function(tokens){
            assert.equal(tokens.length, 1);
            assert.equal(tokens[0].token, token);
            superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token=badtoken").end(function(err, result){
              try {
                assert.ok(err);
                assert.equal(result.status, 500);
                assert.deepEqual(result.body, {error:"server_error", error_description:"Cannot delete non-existing token"});
                persistence.getUserTokens().then(function(tokens){
                  assert.equal(tokens.length, 1);
                  assert.equal(tokens[0].token, token);
                  done();
                }).catch(done);
              } catch(err) {done(err);}
            });
          }).catch(done);
        });
      }).catch(done);
    });
  });
});
