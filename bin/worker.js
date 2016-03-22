#!/usr/bin/env node

var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
var persistence = require('../lib/services/persistence');

require('../lib/services/i18nconfiguration');
require('../lib/services/needleconfiguration');

persistence.init().then(function() {
  var update = function(){
    pagemonitor.update();
    feed.update();
  };
  update();
  setInterval(update, 15 * 60 * 1000);
});
