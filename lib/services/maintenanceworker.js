var pagemonitor = require('../pagemonitor/fetcher');
var feed = require('../feed/fetcher');
var persistence = require('../services/persistence');
var Promise = require('bluebird').Promise;
var logger = require('./logger').logger;
const fork = require('child_process').fork;

require('./needleconfiguration');

var update = async function(){
  await Promise.all([pagemonitor.update(), feed.update()])
  logger.info("Update completed");
};
var cleanup = async function(){
  //TODO: schedule cleanup only for the earliest expiry date
  await Promise.all([pagemonitor.cleanup(), feed.cleanup(), persistence.cleanupExpiredTokens()])
  logger.info("Cleanup completed");
};
var doRunTasks = async function(){
  await update();
  await cleanup();
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
