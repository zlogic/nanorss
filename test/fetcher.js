var fs = require('fs');
var path = require('path');
var assert = require('assert');
var nock = require('nock');

var createLoadFile = require('./utils/loadfile');
var persistence = require('../lib/services/persistence');
var persistencehooks = require('./utils/persistencehooks');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
require('./utils/logging');

var loadFile = createLoadFile('fetcher');

describe('Fetcher', function() {
  persistencehooks.hooks();

  describe('pagemonitor', function() {
    it('should poll newly added pages', function () {
      //this.timeout(60000);
      var config;
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var startDate, endDate;
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('pagemonitor.xml');
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
        return persistence.getPageMonitorItems().lean();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.updatedAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt <= endDate, true);
          return pageMonitorItem;
        });
        pageMonitorItems.sort(function(a, b){ return b.url.localeCompare(a.url); });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
      });
    });
    it('should handle updates with changes in unmonitored sections', function () {
      var config;
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'},
        {url: 'https://site1.com', file: 'page1_update_unmonitored.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var startDate, secondPollDate;
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('pagemonitor.xml');
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
        return persistence.getPageMonitorItems().lean();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.updatedAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt <= secondPollDate, true);
          return pageMonitorItem;
        });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
      });
    });
    it('should handle updates with changes in monitored sections', function () {
      var config;
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'},
        {url: 'https://site1.com', file: 'page1_update_monitored.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var userSaveStartDate, startDate, secondPollDate, endDate;
      return Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      })).then(function(pageFiles) {
        pages.forEach(function(page, i) {
          nock(page.url).get('/').once().reply(200, pageFiles[i]);
        });
        return loadFile('pagemonitor.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.pagemonitor = config;
        userSaveStartDate = new Date();
        return user.save();
      }).then(function() {
        startDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        secondPollDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems().lean();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === pages[0].url ? secondPollDate : startDate), true);
          assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === pages[0].url ? endDate : secondPollDate), true);
          return pageMonitorItem;
        });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,5 +1,5 @@\n \n \n-Some text\n Another line\n+New content\n \n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nAnother line\nNew content\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
      });
    });
    it('should handle connection failures when polling a page', function () {
      var config;
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var startDate, failPollStartDate, failPollEndDate, finalPollStartDate, endDate;
      var errorMessage = 'Error when fetching page: Access denied';
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
        return loadFile('pagemonitor.xml');
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
        assert.equal(pageMonitorItems[0].error, errorMessage);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        finalPollStartDate = new Date();
        return pagemonitor.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems().lean();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === pages[0].url ? finalPollStartDate : startDate), true);
          assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === pages[0].url ? endDate : failPollStartDate), true);
          return pageMonitorItem;
        });
        assert.equal(pageMonitorItems[0].url, pages[0].url);
        assert.equal(pageMonitorItems[1].url, pages[1].url);
        assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
        assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
        assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
        assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
        assert.equal(pageMonitorItems[0].error, null);
        assert.equal(pageMonitorItems[1].error, null);
      });
    });
  });

  describe('feed', function() {
    it('should poll newly added RSS feeds', function () {
      var config;
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var userSaveStartDate, startDate, endDate;
      return Promise.all(feedFiles.map(function(feedFile) {
        return loadFile(feedFile.file);
      })).then(function(loadedFiles) {
        feedFiles.forEach(function(feedFile, i) {
          nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
        });
        return loadFile('opml_two.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        userSaveStartDate = new Date();
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          feed.items.forEach(function(feedItem){
            assert.equal(feedItem.lastSeen >= startDate, true);
            assert.equal(feedItem.lastSeen <= endDate, true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= endDate, true);
              delete feedItem.date;
            }
            delete feedItem.lastSeen;
            delete feedItem._id;
            delete feedItem.__v;
          });
          feed.items.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].items, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2', contents: 'Text 2', url: 'http://site1/link2' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4', url: 'http://site1/link4' }
        ]);
        assert.deepEqual(feeds[1].items, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1' }
        ]);
      });
    });
    it('should poll newly added Atom feeds', function () {
      var config;
      var userSaveStartDate, startDate, endDate;
      return loadFile('atom.xml').then(function(loadedFile) {
        nock('http://sites-site1.com').get('/').once().reply(200, loadedFile);
        return loadFile('opml_one.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        userSaveStartDate = new Date();
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        assert.equal(feeds.length, 1);
        feeds = feeds.map(function(feed) {
          feed.items.forEach(function(feedItem){
            assert.equal(feedItem.lastSeen >= startDate, true);
            assert.equal(feedItem.lastSeen <= endDate, true);
            if(feedItem.url === 'http://site1/link3-good'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= endDate, true);
              delete feedItem.date;
            }
            delete feedItem.lastSeen;
            delete feedItem._id;
            delete feedItem.__v;
          });
          feed.items.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.equal(feeds[0].url, 'http://sites-site1.com');
        assert.deepEqual(feeds[0].items, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2003-12-13T18:30:02.000Z'), contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<0 type="xhtml">\n  <div xmlns="http://www.w3.org/1999/xhtml">\n    <p>Content 1</p>\n  </div>\n</0>', url: 'http://site1/link1-good'},
          { guid: 'http://sites-site1.com@@http://site1/link2-good', title: 'Title 2', date: new Date('2003-12-14T18:30:02.000Z'), contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<0 type="xhtml">\n  <div xmlns="http://www.w3.org/1999/xhtml">\n    <p>Content 1</p>\n  </div>\n</0>', url: 'http://site1/link2-good' },
          { guid: 'http://sites-site1.com@@Item@3', title: 'Title 3', contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<0 type="xhtml">\n  <div xmlns="http://www.w3.org/1999/xhtml">\n    <p>Content 1</p>\n  </div>\n</0>', url: 'http://site1/link3-good' }
        ]);
      });
    });
    it('should poll newly added RDF feeds', function () {
      var config;
      var userSaveStartDate, startDate, endDate;
      return loadFile('rdf.xml').then(function(loadedFile) {
        nock('http://sites-site1.com').get('/').once().reply(200, loadedFile);
        return loadFile('opml_one.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        userSaveStartDate = new Date();
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        assert.equal(feeds.length, 1);
        feeds = feeds.map(function(feed) {
          feed.items.forEach(function(feedItem){
            assert.equal(feedItem.lastSeen >= startDate, true);
            assert.equal(feedItem.lastSeen <= endDate, true);
            delete feedItem.lastSeen;
            delete feedItem._id;
            delete feedItem.__v;
          });
          feed.items.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.equal(feeds[0].url, 'http://sites-site1.com');
        assert.deepEqual(feeds[0].items, [
          { guid: 'http://sites-site1.com@@http://site1/link1', title: 'Title 1', date: new Date('2013-09-26T21:36:20.000Z'), contents: 'Description 1', url: 'http://site1/link1' }
        ]);
      });
    });
    it('should handle updates to RSS feeds', function () {
      this.timeout(4000);
      var config;
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'},
        {url: 'http://sites-site1.com', file: 'rss1_updated.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var notUpdatedLinks = ['http://site1/link1', 'http://site1/link3'];
      var newItems = ['http://site1/link3-updated', 'http://site1/link5'];
      var userSaveStartDate, startDate, updateDate, endDate;
      return Promise.all(feedFiles.map(function(feedFile) {
        return loadFile(feedFile.file);
      })).then(function(loadedFiles) {
        feedFiles.forEach(function(feedFile, i) {
          nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
        });
        return loadFile('opml_two.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        userSaveStartDate = new Date();
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        updateDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          feed.items.forEach(function(feedItem){
            assert.equal(feedItem.lastSeen >= (notUpdatedLinks.includes(feedItem.url) ? startDate : updateDate), true);
            assert.equal(feedItem.lastSeen <= (notUpdatedLinks.includes(feedItem.url) ? updateDate : endDate), true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= updateDate, true);
              assert.equal(feedItem.date <= endDate, true);
              delete feedItem.date;
            }
            delete feedItem.lastSeen;
            delete feedItem._id;
            delete feedItem.__v;
          });
          feed.items.sort(function(a, b){
            var comparison = a.url.localeCompare(b.url);
            if(comparison !== 0)  return comparison;
            var comparison = a.title.localeCompare(b.title);
            if(comparison !== 0)  return comparison;
            return a.contents.localeCompare(b.contents);
          });
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].items, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2 (updated)', contents: 'Text 2', url: 'http://site1/link2' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3' },
          { guid: 'http://sites-site1.com@@http://site1/link3-updated', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3-updated' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4 (updated)', url: 'http://site1/link4' },
          { guid: 'http://sites-site1.com@@Item@5', title: 'Title 5', date: new Date('2016-06-11T10:34:00.000Z'), contents: 'Text 5', url: 'http://site1/link5' }
        ]);
        assert.deepEqual(feeds[1].items, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1' }
        ]);
      });
    });
    it('should handle connection failures when polling an RSS feed', function () {
      this.timeout(4000);
      var config;
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var userSaveStartDate, startDate, failPollStartDate, failPollEndDate, finalPollStartDate, endDate;
      return Promise.all(feedFiles.map(function(feedFile) {
        return loadFile(feedFile.file);
      })).then(function(loadedFiles) {
        feedFiles.forEach(function(feedFile, i) {
          nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
        });
        nock(feedFiles[0].url).get('/').once().replyWithError('Access denied');
        nock(feedFiles[1].url).get('/').once().reply(200, feedFiles[1]);
        feedFiles.forEach(function(feedFile, i) {
          nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
        });
        return loadFile('opml_two.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        userSaveStartDate = new Date();
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        failPollStartDate = new Date();
        return feed.update();
      }).then(function() {
        failPollEndDate = new Date();
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          feed.items.forEach(function(feedItem){
            assert.equal(feedItem.lastSeen >= startDate, true);
            assert.equal(feedItem.lastSeen <= failPollEndDate, true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= failPollStartDate, true);
              delete feedItem.date;
            }
            delete feedItem.lastSeen;
            delete feedItem._id;
            delete feedItem.__v;
          });
          feed.items.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].items, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2', contents: 'Text 2', url: 'http://site1/link2' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4', url: 'http://site1/link4' }
        ]);
        assert.deepEqual(feeds[1].items, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1' }
        ]);
        finalPollStartDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          feed.items.forEach(function(feedItem){
            assert.equal(feedItem.lastSeen >= finalPollStartDate, true);
            assert.equal(feedItem.lastSeen <= endDate, true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= (feedItem.url === 'http://site1/link2' ? endDate : failPollStartDate), true);
              delete feedItem.date;
            }
            delete feedItem.lastSeen;
            delete feedItem._id;
            delete feedItem.__v;
          });
          feed.items.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].items, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2', contents: 'Text 2', url: 'http://site1/link2' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4', url: 'http://site1/link4' }
        ]);
        assert.deepEqual(feeds[1].items, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1' }
        ]);
      });
    });
  });
});
