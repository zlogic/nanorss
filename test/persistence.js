var fs = require('fs');
var assert = require('assert');

require('./utils/dbconfiguration.js');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
require('./utils/logging');

describe('Persistence', function() {
  beforeEach(function(done) {
    logger.info(this.currentTest.fullTitle());
    return persistence.init({force: true}).then(function(task){
      done();
    });
  });

  describe('operations', function () {
    it('should create a new user with an empty database', function (done) {
      return persistence.getUserData().then(function(user){
        assert.equal(user.username, 'default');
        done();
      }).catch(done);
    });
  });
});
