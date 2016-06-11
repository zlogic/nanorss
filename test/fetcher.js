var fs = require('fs');
var assert = require('assert');
var nock = require('nock');

require('./utils/dbconfiguration.js');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
require('./utils/logging');
require('./utils/i18nconfiguration');
var i18n = require('i18n');

var loadFile = function(filename) {
  return new Promise(function(resolve, reject){
    fs.readFile(filename, function(error, data){
      if(error) return reject(error);
      resolve(data);
    });
  });
};

describe('Fetcher', function() {
  beforeEach(function(done) {
    logger.info(this.currentTest.fullTitle());
    return persistence.init({force: true}).then(function(){
      done();
    });
  });
  describe('pagemonitor', function() {
    it('should poll newly added pages', function (done) {
      //this.timeout(60000);
      var config;
      var pages = [
        {url: 'https://site1.com', file: './test/data/fetcher/page1.html'},
        {url: 'http://site2.com', file: './test/data/fetcher/page2.txt'}
      ];
      var startDate, endDate;
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('./test/data/fetcher/pagemonitor.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.pagemonitor = config;
        return user.save();
      }).then(function() {
        startDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt >= startDate, true);
          assert.equal(pageMonitorItem.createdAt <= endDate, true);
          assert.equal(pageMonitorItem.updatedAt <= endDate, true);
          return pageMonitorItem.toJSON();
        });
        //pageMonitorItems.sort(function(a, b){ return a.url.localeCompare(b.url); })
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
        done();
      }).catch(done);
    });
    it('should handle updates with changes in unmonitored sections', function (done) {
      var config;
      var pages = [
        {url: 'https://site1.com', file: './test/data/fetcher/page1.html'},
        {url: 'http://site2.com', file: './test/data/fetcher/page2.txt'},
        {url: 'https://site1.com', file: './test/data/fetcher/page1_update_unmonitored.html'},
        {url: 'http://site2.com', file: './test/data/fetcher/page2.txt'}
      ];
      var startDate, secondPollDate, endDate;
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('./test/data/fetcher/pagemonitor.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.pagemonitor = config;
        return user.save();
      }).then(function() {
        startDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        secondPollDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt >= startDate, true);
          assert.equal(pageMonitorItem.createdAt <= secondPollDate, true);
          assert.equal(pageMonitorItem.updatedAt <= secondPollDate, true);
          return pageMonitorItem.toJSON();
        });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
        done();
      }).catch(done);
    });
    it('should handle updates with changes in monitored sections', function (done) {
      var config;
      var pages = [
        {url: 'https://site1.com', file: './test/data/fetcher/page1.html'},
        {url: 'http://site2.com', file: './test/data/fetcher/page2.txt'},
        {url: 'https://site1.com', file: './test/data/fetcher/page1_update_monitored.html'},
        {url: 'http://site2.com', file: './test/data/fetcher/page2.txt'}
      ];
      var startDate, secondPollDate, endDate;
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('./test/data/fetcher/pagemonitor.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.pagemonitor = config;
        return user.save();
      }).then(function() {
        startDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        secondPollDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === pages[0].url ? secondPollDate : startDate), true);
          assert.equal(pageMonitorItem.createdAt <= secondPollDate, true);
          assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === pages[0].url ? endDate : secondPollDate), true);
          return pageMonitorItem.toJSON();
        });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,5 +1,5 @@\n \n \n-Some text\n Another line\n+New content\n \n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nAnother line\nNew content\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
        done();
      }).catch(done);
    });
    it('should handle connection failures when polling a page', function (done) {
      var config;
      var pages = [
        {url: 'https://site1.com', file: './test/data/fetcher/page1.html'},
        {url: 'http://site2.com', file: './test/data/fetcher/page2.txt'}
      ];
      var startDate, failPollStartDate, failPollEndDate, finalPollStartDate, endDate;
      var errorMessage = i18n.__('Error when fetching page: %s', 'Access denied');
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        nock(pages[0].url).get('/').once().replyWithError('Access denied');
        nock(pages[1].url).get('/').once().reply(200, pageFiles[1]);
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('./test/data/fetcher/pagemonitor.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.pagemonitor = config;
        return user.save();
      }).then(function() {
        startDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        failPollStartDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        failPollEndDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        assert.equal(pageMonitorItems[0].updatedAt >= failPollStartDate, true);
        assert.equal(pageMonitorItems[0].updatedAt <= failPollEndDate, true);
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[0].delta, errorMessage);
        assert.equal(pageMonitorItems[0].contents, errorMessage);
        finalPollStartDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === pages[0].url ? finalPollStartDate : startDate), true);
          assert.equal(pageMonitorItem.createdAt <= failPollStartDate, true);
          assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === pages[0].url ? endDate : failPollStartDate), true);
          return pageMonitorItem.toJSON();
        });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n-' + errorMessage + '\n+\n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
        done();
      }).catch(done);
    });
  });
});
