#!/usr/bin/env node

var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
var persistence = require('../lib/services/persistence');
var i18n = require('i18n');
var Promise = require('bluebird').Promise;
var logger = require('../lib/services/logger').logger;

require('../lib/services/i18nconfiguration');
require('../lib/services/needleconfiguration');

persistence.init().then(function() {
  var update = function(){
    Promise.all([pagemonitor.update(),feed.update()]).then(function(){
      logger.info(i18n.__("Update completed"));
    })
  };
  update();
  setInterval(update, 15 * 60 * 1000);
});
