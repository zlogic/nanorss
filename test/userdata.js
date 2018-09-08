var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var persistence = require('../lib/services/persistence');
var persistencebase = require('./utils/persistencebase');
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

var prepopulate = function() {
  return persistence.getUserData().then(function(user){
    user.opml = "<opml/>";
    user.pagemonitor = "<pagemonitor/>";
    user.password = "pass";
    return user.save();
  })
};

describe('Service', function() {
  serviceBase.hooks();

  persistencebase.hooks();

  var validateDefaultUserdata = function(done){
    persistence.getUserData().then(function(user){
      assert.equal(user.username, 'default');
      return user.verifyPassword('pass').then(function(passwordValid){
        try {
          assert.equal(passwordValid, true);
          done();
        } catch (err) { done(err) };
      });
    }).catch(done);
  };

  describe('userdata', function () {
    it('should get details for an authenticated user', function (done) {
      var userData = {username: "default", password: "pass"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/user/configuration").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'default', opml: '<opml/>', pagemonitor: '<pagemonitor/>' });
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the username for an authenticated user', function (done) {
      var userData = {username: "default", password: "pass"};
      var newUserData = {username: "default-1"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, {});
              persistence.getUserData().then(function(user){
                assert.equal(user.username, 'default-1');
                assert.equal(user.opml, '<opml/>');
                assert.equal(user.pagemonitor, '<pagemonitor/>');
                return user.verifyPassword('pass').then(function(passwordValid){
                  try {
                    assert.equal(passwordValid, true);
                    done();
                  } catch (err) { done(err) };
                });
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the password for an authenticated user', function (done) {
      var userData = {username: "default", password: "pass"};
      var newUserData = {password: "pass-1"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, {});
              persistence.getUserData().then(function(user){
                assert.equal(user.username, 'default');
                assert.equal(user.opml, '<opml/>');
                assert.equal(user.pagemonitor, '<pagemonitor/>');
                return user.verifyPassword('pass-1').then(function(passwordValid){
                  try {
                    assert.equal(passwordValid, true);
                    done();
                  } catch (err) { done(err) };
                });
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the username and password for an authenticated user', function (done) {
      var userData = {username: "default", password: "pass"};
      var newUserData = {username: "default-1", password: "pass-1"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, {});
              persistence.getUserData().then(function(user){
                assert.equal(user.username, 'default-1');
                assert.equal(user.opml, '<opml/>');
                assert.equal(user.pagemonitor, '<pagemonitor/>');
                return user.verifyPassword('pass-1').then(function(passwordValid){
                  try {
                    assert.equal(passwordValid, true);
                    done();
                  } catch (err) { done(err) };
                });
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to change the username for an authenticated user if the new username is empty', function (done) {
      var userData = {username: "default", password: "pass"};
      var newUserData = {username: ""};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, 'User validation failed: username: Path `username` is required.');
              validateDefaultUserdata(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to change the password for an authenticated user if the new password is empty', function (done) {
      var userData = {username: "default", password: "pass"};
      var newUserData = {password: ""};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, 'User validation failed: password: Path `password` is required.');
              validateDefaultUserdata(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should ignore id in requests for getting user data and use OAuth data instead', function (done) {
      var userData = {username: "default", password: "pass"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/user/configuration").set(tokenHeader(token)).send({id: 2}).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'default', opml: '<opml/>', pagemonitor: '<pagemonitor/>' });
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should not be able to get the page for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/user").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get the page for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/user").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get user data for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/user/configuration").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get user data for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/user/configuration").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to change user data for an unauthenticated user (no token)' , function (done) {
      var newUserData = {username: "default", password: "pass", id: 1};
      prepopulate().then(function(){
        superagent.post(baseUrl + "/user/configuration").send(newUserData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultUserdata(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to change user data for an unauthenticated user (bad token)', function (done) {
      var newUserData = {username: "default", password: "pass", id: 1};
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultUserdata(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
