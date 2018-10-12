var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var persistence = require('../lib/services/persistence');
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

var prepopulate = async function() {
  var user = await persistence.getUserData();
  user.opml = "<opml/>";
  user.pagemonitor = "<pagemonitor/>";
  user.password = "pass";
  return user.save();
};

describe('Service', function() {
  serviceBase.hooks();

  var validateDefaultUserdata = async function(){
    var user = await persistence.getUserData();
    assert.equal(user.username, 'default');
    var passwordValid = await user.verifyPassword('pass');
    assert.equal(passwordValid, true);
  };

  describe('userdata', function () {
    it('should get details for an authenticated user', async function () {
      var userData = {username: "default", password: "pass"};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.get(baseUrl + "/user/configuration").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'default', opml: '<opml/>', pagemonitor: '<pagemonitor/>' });
    });
    it('should be able to change the username for an authenticated user', async function () {
      var userData = {username: "default", password: "pass"};
      var newUserData = {username: "default-1"};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {});

      user = await persistence.getUserData();
      assert.equal(user.username, 'default-1');
      assert.equal(user.opml, '<opml/>');
      assert.equal(user.pagemonitor, '<pagemonitor/>');
      var passwordValid = await user.verifyPassword('pass');
      assert.equal(passwordValid, true);
    });
    it('should be able to change the password for an authenticated user', async function () {
      var userData = {username: "default", password: "pass"};
      var newUserData = {password: "pass-1"};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {});

      user = await persistence.getUserData();
      assert.equal(user.username, 'default');
      assert.equal(user.opml, '<opml/>');
      assert.equal(user.pagemonitor, '<pagemonitor/>');
      var passwordValid = await user.verifyPassword('pass-1');
      assert.equal(passwordValid, true);
    });
    it('should be able to change the username and password for an authenticated user', async function () {
      var userData = {username: "default", password: "pass"};
      var newUserData = {username: "default-1", password: "pass-1"};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {});

      user = await persistence.getUserData();
      assert.equal(user.username, 'default-1');
      assert.equal(user.opml, '<opml/>');
      assert.equal(user.pagemonitor, '<pagemonitor/>');
      passwordValid = await user.verifyPassword('pass-1');
      assert.equal(passwordValid, true);
    });
    it('should not be able to change the username for an authenticated user if the new username is empty', async function () {
      var userData = {username: "default", password: "pass"};
      var newUserData = {username: ""};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Validation error: Validation notEmpty on username failed');
      return validateDefaultUserdata();
    });
    it('should not be able to change the password for an authenticated user if the new password is empty', async function () {
      var userData = {username: "default", password: "pass"};
      var newUserData = {password: ""};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData)
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Validation error: Validation notEmpty on password failed');
      return validateDefaultUserdata();
    });
    it('should ignore id in requests for getting user data and use OAuth data instead', async function () {
      var userData = {username: "default", password: "pass"};

      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.get(baseUrl + "/user/configuration").set(tokenHeader(token)).send({id: 2});
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'default', opml: '<opml/>', pagemonitor: '<pagemonitor/>' });
    });
    it('should not be able to get the page for an unauthenticated user (no token)', async function () {
      var user = await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/user");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get the page for an unauthenticated user (bad token)', async function () {
      var user = await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/user").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get user data for an unauthenticated user (no token)', async function () {
      var user = await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/user/configuration")
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get user data for an unauthenticated user (bad token)', async function () {
      var user = await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/user/configuration").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to change user data for an unauthenticated user (no token)', async function () {
      var newUserData = {username: "default", password: "pass", id: 1};
      var user = await prepopulate();

      var error;
      try {
        await superagent.post(baseUrl + "/user/configuration").send(newUserData);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      return validateDefaultUserdata();
    });
    it('should not be able to change user data for an unauthenticated user (bad token)', async function () {
      var newUserData = {username: "default", password: "pass", id: 1};
      var user = await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.post(baseUrl + "/user/configuration").set(tokenHeader(token)).send(newUserData);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      return validateDefaultUserdata();
    });
  });
});
