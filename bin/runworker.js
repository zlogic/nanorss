#!/usr/bin/env node

var maintenanceworker = require('../lib/services/maintenanceworker');
var persistence = require('../lib/services/persistence');

require('../lib/services/i18nconfiguration');

persistence.init().then(function() {
  maintenanceworker.runTasks();
});
