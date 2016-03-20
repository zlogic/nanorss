var express = require('express');
var i18n = require('i18n');
var persistence = require('../lib/services/persistence');
var pagemonitorConfiguration = require('../lib/pagemonitor/configuration');
var Promise = require('bluebird').Promise;
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var processPagemonitorData = function(){
    return persistence.getUserData().then(function(user){
      return new Promise(function(resolve, reject){
        pagemonitorConfiguration.configXml(user.pagemonitor, function(err, pagemonitorconfiguration){
          if(err)
            return reject(err)
          var findPageMonitorConfiguration = function(url){
            return pagemonitorconfiguration.pages.page.find(function(page){
              return page.$.url === url;
            });
          };
          persistence.getPageMonitorItems().then(function(monitoredPages){
            var monitoredPagesItems = monitoredPages.map(function(page){
              var pageMonitorConfiguration = findPageMonitorConfiguration(page.url);
              var pageTitle = (pageMonitorConfiguration !== undefined )? pageMonitorConfiguration._ : undefined;
              return {
                date: page.updated,
                title: pageTitle,
                contents: page.delta.replace(/\n/g, '<br>\n'),
                url: page.url
              };
            });
            resolve(monitoredPagesItems);
          });
        });
      });
    });
  };
  var items = [];
  processPagemonitorData().then(function(newItems){
    items = items.concat(newItems);
    items.sort(function(a, b){
      return a.date.getTime() - b.date.getTime();
    })
    res.render('index', {
      title: i18n.__('nanoRSS'),
      items: items
    });
  }).catch(next);
});

module.exports = router;
