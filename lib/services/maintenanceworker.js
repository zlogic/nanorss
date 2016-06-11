var pagemonitor = require('../pagemonitor/fetcher');
var feed = require('../feed/fetcher');
var i18n = require('i18n');
var Promise = require('bluebird').Promise;
var logger = require('./logger').logger;

require('./needleconfiguration');

var update = function(){
  return Promise.all([pagemonitor.update(),feed.update()]).then(function(){
    logger.info(i18n.__("Update completed"));
  })
};
var cleanup = function(){
  //TODO: schedule cleanup only for the earliest expiry date
  return Promise.all([pagemonitor.cleanup(),feed.cleanup()]).then(function(){
    logger.info(i18n.__("Cleanup completed"));
  })
};
var runTasks = function(){
  return update().then(cleanup);
};

var startWorker = function(){
  runTasks();
  setInterval(runTasks, 15 * 60 * 1000);
};

module.exports.runTasks = runTasks;
module.exports.startWorker = startWorker;
