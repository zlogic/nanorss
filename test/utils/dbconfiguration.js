var persistencefactory = require('../../lib/services/persistencefactory');
var persistence = require('../../lib/services/persistence');
var path = require('path');
var testdir = require('./testdir');
var Sequelize = require('sequelize');
var logger = require('../../lib/services/logger');

var reconfigureDb = function(inMemory){
  inMemory = inMemory !== undefined ? inMemory : true;
  var storage = inMemory === true ? ":memory:" : path.resolve(testdir.tmpdir, "nanoRSS.sqlite");
  var currentPersistence = persistencefactory.model("sqlite:", {storage: storage, isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger, operatorsAliases: false});
  for(var k in currentPersistence)
    persistence[k] = currentPersistence[k];
}

module.exports.reconfigureDb = reconfigureDb;
