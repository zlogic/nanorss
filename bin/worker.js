#!/usr/bin/env node

var maintenanceworker = require('../lib/services/maintenanceworker');
var persistence = require('../lib/services/persistence');

persistence.init().then(function() {
  maintenanceworker.startWorker();
});
