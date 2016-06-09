var persistence = require('../../lib/services/persistence');
var path = require('path');
var testdir = require('./testdir');

var reconfigureDb = function() {
console.log(persistence.dbOptions)
  //persistence.dbOptions.storage = path.resolve(testdir.tmpdir, "nanoRSS.sqlite");
  //TODO: apply real DB configuration
};

module.exports.reconfigureDb = reconfigureDb;
