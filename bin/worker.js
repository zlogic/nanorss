#!/usr/bin/env node

var pagemonitor = require('../lib/pagemonitor/fetcher');
var persistence = require('../lib/services/persistence');

require('../lib/services/i18nconfiguration');

persistence.init().then(function() {
  pagemonitor.update();
  setInterval(pagemonitor.update, 15 * 60 * 1000);
});
