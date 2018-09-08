var persistence = require('../../lib/services/persistence');
var logger = require('../../lib/services/logger').logger;
var Mockgoose = require('mockgoose').Mockgoose;
var MongoBins = require('mongodb-prebuilt').MongoBins;
require('./logging');

var mockgoose = new Mockgoose(persistence.mongoose);

before(function() {
  this.timeout(10000);
  return mockgoose.prepareStorage().then(function() {
    return persistence.init();
  });
});

after(function() {
  this.timeout(10000);
  return persistence.close().then(function() {
    // TODO: fix this once https://github.com/Mockgoose/Mockgoose/issues/61 or https://github.com/Mockgoose/Mockgoose/pull/72 are resolved
    return new MongoBins("mongo", ["--eval", "db.getSiblingDB('admin').shutdownServer()"]).run();
  });
});

var hooks = function(){

  beforeEach(function() {
    logger.info(this.currentTest.fullTitle());
    return persistence.ensureIndexes();
  });

  afterEach(function() {
    return mockgoose.helper.reset();
  });
};

module.exports.hooks = hooks;
