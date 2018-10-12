var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var persistence = require('../lib/services/persistence');
var superagent = require('superagent');
var uuid = require('uuid/v4');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var sleep = serviceBase.sleep;
var tokenHeader = serviceBase.tokenHeader;

var prepopulate = async function() {
  var user = await persistence.getUserData()
  user.password = "pass";
  return user.save();
};

describe('Service', function() {
  serviceBase.hooks();

  afterEach(function() {
    delete process.env.TOKEN_EXPIRES_DAYS;
  });

  var oneSecond = 1 / (24 * 60 * 60);

  describe('authentication', function () {
    it('should accept authentication of a valid user', async function () {
      var userData = {username: "default", password: "pass"};
      var user = await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);

      user = await user.reload({ include: [{ all: true }]});
      assert.equal(user.Tokens.length, 1);
      assert.equal(user.Tokens[0].id, token);
      assert.equal(user.Tokens[0].UserId, 1);
    });
    it('should delete authentication of a valid user on logout', async function () {
      var userData = {username: "default", password: "pass"};
      var user = await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);

      user = await user.reload({ include: [{ all: true }]});
      assert.equal(user.Tokens.length, 1);
      assert.equal(user.Tokens[0].id, token);
      assert.equal(user.Tokens[0].UserId, 1);

      var result = await superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.text, "");

      user = await user.reload({ include: [{ all: true }]});
      assert.deepEqual(user.Tokens, []);
    });
    it('should reject authentication for expired tokens', async function () {
      this.timeout(4000);
      var userData = {username: "default", password: "pass"};
      process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
      var user = await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);

      user = await user.reload({ include: [{ all: true }]});
      assert.equal(user.Tokens.length, 1);
      assert.equal(user.Tokens[0].id, token);
      assert.equal(user.Tokens[0].UserId, 1);

      await sleep(1000);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 401);
      assert.equal(result.text, "Unauthorized");

      user = await user.reload({ include: [{ all: true }]});
      assert.deepEqual(user.Tokens, []);
    });
    it('should perform maintenance of expired tokens by deleting them', async function () {
      this.timeout(4000);
      var userData = {username: "default", password: "pass"};
      process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
      var user = await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);

      user = await user.reload({ include: [{ all: true }]});
      assert.equal(user.Tokens.length, 1);
      assert.equal(user.Tokens[0].id, token);
      assert.equal(user.Tokens[0].UserId, 1);

      await sleep(1000);
      await persistence.cleanupExpiredTokens()
      user = await user.reload({ include: [{ all: true }]});
      assert.deepEqual(user.Tokens, []);
    });
    it('should retry token generation in case a generated token uuid is already in use', async function () {
      var userData = {username: "default", password: "pass"};
      var defaultGenerator = uuid.v4;
      try {
        var generatorPattern = {1: "1", 2: "1", 3:"1", 4: "1", 5: "1", 6: "2"};
        var generatorCounter = 0;
        var brokenGenerator = function(){
          generatorCounter++;
          return generatorPattern[generatorCounter] || generatorCounter;
        };
        var user = await prepopulate();
        uuid.v4 = brokenGenerator;

        var {token, result} = await authenticateUser(userData);
        assert.equal(result.status, 200);
        assert.equal(token, "1");

        var {token, result} = await authenticateUser(userData);
        assert.equal(result.status, 200);
        assert.equal(token, "2");
        assert.equal(generatorCounter, 6);

        user = await user.reload({ include: [{ all: true }]});
        assert.equal(user.Tokens.length, 2);
        assert.equal(user.Tokens[0].id, "1");
        assert.equal(user.Tokens[0].UserId, 1);
        assert.equal(user.Tokens[1].id, "2");
        assert.equal(user.Tokens[1].UserId, 1);
      } finally {
        uuid.v4 = defaultGenerator;
      }
    });
    it('should give up retrying token generation in case a generated token uuid is already in use if number of attempts is exceeded', async function () {
      this.timeout(10000);
      var userData = {username: "default", password: "pass"};
      var defaultGenerator = uuid.v4;
      try {
        var generatorCounter = 0;
        var brokenGenerator = function(){
          generatorCounter++;
          return "1";
        };
        var user = await prepopulate();
        uuid.v4 = brokenGenerator;

        var {token, result} = await authenticateUser(userData);
        assert.equal(result.status, 200);
        assert.equal(token, "1");

        var error;
        var result;
        try {
          await authenticateUser(userData);
        } catch(err) {
          error = err;
          result = err.response;
        }
        token = result.body.access_token;
        assert.ok(error);
        assert.equal(error.status, 500);
        assert.equal(!!token, false);
        assert.equal(generatorCounter, 1 + 5);
        assert.deepEqual(error.response.body, {error:"server_error", error_description:"Cannot create token"});

        user = await user.reload({ include: [{ all: true }]});
        assert.equal(user.Tokens.length, 1);
        assert.equal(user.Tokens[0].id, "1");
        assert.equal(user.Tokens[0].UserId, 1);
      } finally {
        uuid.v4 = defaultGenerator;
      }
    });
    it('should reject authentication of an invalid user', async function () {
      var userData = {username: "default", password: "badpassword"};
      var user = await prepopulate();
      try {
        await authenticateUser(userData);
      } catch(err) {
        assert.ok(err);
        assert.equal(err.status, 500);
        assert.equal(err.response.body.error_description, 'Bad credentials');
        var token = err.response.body.access_token;
        assert.equal(!!token, false);
      }
    });
    it('should reject logout for a non-existing token', async function () {
      var userData = {username: "default", password: "pass"};
      var user = await prepopulate();
      var {token, result} = await authenticateUser(userData);

      assert.equal(result.status, 200);
      assert.ok(token);

      user = await user.reload({ include: [{ all: true }]});
      assert.equal(user.Tokens.length, 1);
      assert.equal(user.Tokens[0].id, token);
      assert.equal(user.Tokens[0].UserId, 1);

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token=badtoken");
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {error:"server_error", error_description:"Cannot delete non-existing token"});

      user = await user.reload({ include: [{ all: true }]});
      assert.equal(user.Tokens.length, 1);
      assert.equal(user.Tokens[0].id, token);
      assert.equal(user.Tokens[0].UserId, 1);
    });
  });
});
