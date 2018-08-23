var pagemonitor = require('../pagemonitor/fetcher');
var feed = require('../feed/fetcher');
var persistence = require('../services/persistence');
var Promise = require('bluebird').Promise;
var logger = require('./logger').logger;
const fork = require('child_process').fork;

require('./needleconfiguration');

var update = function(){
  return Promise.all([pagemonitor.update(), feed.update()]).then(function(){
    logger.info("Update completed");
  })
};
var cleanup = function(){
  //TODO: schedule cleanup only for the earliest expiry date
  return Promise.all([pagemonitor.cleanup(), feed.cleanup(), persistence.cleanupExpiredTokens()]).then(function(){
    logger.info("Cleanup completed");
  })
};
var doRunTasks = function(){
  return update().then(cleanup);
};

var runTasks = function(){
  //Run tasks in-process
  doRunTasks();
  //Run tasks externally
  //fork('./bin/runworker');
};

var startWorker = function(){
  runTasks();
  setInterval(runTasks, 15 * 60 * 1000);
};

module.exports.runTasks = doRunTasks;
module.exports.startWorker = startWorker;
