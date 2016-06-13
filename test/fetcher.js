var fs = require('fs');
var path = require('path');
var assert = require('assert');
var nock = require('nock');

require('./utils/dbconfiguration.js');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
require('./utils/logging');
require('./utils/i18nconfiguration');
var i18n = require('i18n');

var loadFile = function(filename) {
  return new Promise(function(resolve, reject){
    fs.readFile(path.join(__dirname, 'data', 'fetcher', filename), function(error, data){
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
        //pageMonitorItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
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
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'},
        {url: 'https://site1.com', file: 'page1_update_unmonitored.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var startDate, secondPollDate, endDate;
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
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'},
        {url: 'https://site1.com', file: 'page1_update_monitored.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var startDate, secondPollDate, endDate;
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
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
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

  describe('feed', function() {
    it('should poll newly added RSS feeds', function (done) {
      var config;
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var startDate, endDate;
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
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          assert.equal(feed.createdAt >= startDate, true);
          assert.equal(feed.updatedAt >= startDate, true);
          assert.equal(feed.createdAt <= endDate, true);
          assert.equal(feed.updatedAt <= endDate, true);
          feed = feed.toJSON();
          feed.FeedItems.forEach(function(feedItem){
            assert.equal(feedItem.createdAt >= startDate, true);
            assert.equal(feedItem.updatedAt >= startDate, true);
            assert.equal(feedItem.createdAt <= endDate, true);
            assert.equal(feedItem.updatedAt <= endDate, true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= endDate, true);
              delete feedItem.date;
            }
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].FeedItems, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2', contents: 'Text 2', url: 'http://site1/link2', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4', url: 'http://site1/link4', FeedUrl: 'http://sites-site1.com' }
        ]);
        assert.deepEqual(feeds[1].FeedItems, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1', FeedUrl: 'http://updates-site2.com' }
        ]);
        done();
      }).catch(done);
    });
    it('should poll newly added Atom feeds', function (done) {
      var config;
      var startDate, endDate;
      return loadFile('atom.xml').then(function(loadedFile) {
        nock('http://sites-site1.com').get('/').once().reply(200, loadedFile);
        return loadFile('opml_one.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
        assert.equal(feeds.length, 1);
        feeds = feeds.map(function(feed) {
          assert.equal(feed.createdAt >= startDate, true);
          assert.equal(feed.updatedAt >= startDate, true);
          assert.equal(feed.createdAt <= endDate, true);
          assert.equal(feed.updatedAt <= endDate, true);
          feed = feed.toJSON();
          feed.FeedItems.forEach(function(feedItem){
            assert.equal(feedItem.createdAt >= startDate, true);
            assert.equal(feedItem.updatedAt >= startDate, true);
            assert.equal(feedItem.createdAt <= endDate, true);
            assert.equal(feedItem.updatedAt <= endDate, true);
            if(feedItem.url === 'http://site1/link3-good'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= endDate, true);
              delete feedItem.date;
            }
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        assert.equal(feeds[0].url, 'http://sites-site1.com');
        assert.deepEqual(feeds[0].FeedItems, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2003-12-13T18:30:02.000Z'), contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<0 type="xhtml">\n  <div xmlns="http://www.w3.org/1999/xhtml">\n    <p>Content 1</p>\n  </div>\n</0>', url: 'http://site1/link1-good', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@http://site1/link2-good', title: 'Title 2', date: new Date('2003-12-14T18:30:02.000Z'), contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<0 type="xhtml">\n  <div xmlns="http://www.w3.org/1999/xhtml">\n    <p>Content 1</p>\n  </div>\n</0>', url: 'http://site1/link2-good', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@3', title: 'Title 3', contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<0 type="xhtml">\n  <div xmlns="http://www.w3.org/1999/xhtml">\n    <p>Content 1</p>\n  </div>\n</0>', url: 'http://site1/link3-good', FeedUrl: 'http://sites-site1.com' }
        ]);
        done();
      }).catch(done);
    });
    it('should poll newly added RDF feeds', function (done) {
      var config;
      var startDate, endDate;
      return loadFile('rdf.xml').then(function(loadedFile) {
        nock('http://sites-site1.com').get('/').once().reply(200, loadedFile);
        return loadFile('opml_one.xml');
      }).then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
        assert.equal(feeds.length, 1);
        feeds = feeds.map(function(feed) {
          assert.equal(feed.createdAt >= startDate, true);
          assert.equal(feed.updatedAt >= startDate, true);
          assert.equal(feed.createdAt <= endDate, true);
          assert.equal(feed.updatedAt <= endDate, true);
          feed = feed.toJSON();
          feed.FeedItems.forEach(function(feedItem){
            assert.equal(feedItem.createdAt >= startDate, true);
            assert.equal(feedItem.updatedAt >= startDate, true);
            assert.equal(feedItem.createdAt <= endDate, true);
            assert.equal(feedItem.updatedAt <= endDate, true);
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        assert.equal(feeds[0].url, 'http://sites-site1.com');
        assert.deepEqual(feeds[0].FeedItems, [
          { guid: 'http://sites-site1.com@@http://site1/link1', title: 'Title 1', date: new Date('2013-09-26T21:36:20.000Z'), contents: 'Description 1', url: 'http://site1/link1', FeedUrl: 'http://sites-site1.com' }
        ]);
        done();
      }).catch(done);
    });
    it('should handle updates to RSS feeds', function (done) {
      var config;
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'},
        {url: 'http://sites-site1.com', file: 'rss1_updated.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var notUpdatedLinks = ['http://site1/link1', 'http://site1/link3'];
      var newItems = ['http://site1/link3-updated', 'http://site1/link5'];
      var startDate, updateDate, endDate;
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
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        updateDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          assert.equal(feed.createdAt >= startDate, true);
          assert.equal(feed.updatedAt >= startDate, true);
          assert.equal(feed.createdAt <= endDate, true);
          assert.equal(feed.updatedAt <= endDate, true);
          feed = feed.toJSON();
          feed.FeedItems.forEach(function(feedItem){
            assert.equal(feedItem.createdAt >= (newItems.includes(feedItem.url) ? updateDate : startDate), true);
            assert.equal(feedItem.updatedAt >= (notUpdatedLinks.includes(feedItem.url) ? startDate : updateDate), true);
            assert.equal(feedItem.createdAt <= (newItems.includes(feedItem.url) ? endDate : updateDate), true);
            assert.equal(feedItem.updatedAt <= (notUpdatedLinks.includes(feedItem.url) ? updateDate : endDate), true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= updateDate, true);
              assert.equal(feedItem.date <= endDate, true);
              delete feedItem.date;
            }
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          feed.FeedItems.sort(function(a, b){
            var comparison = a.url.localeCompare(b.url);
            if(comparison !== 0)  return comparison;
            var comparison = a.title.localeCompare(b.title);
            if(comparison !== 0)  return comparison;
            return a.contents.localeCompare(b.contents);
          });
          return feed;
        });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].FeedItems, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2 (updated)', contents: 'Text 2', url: 'http://site1/link2', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@http://site1/link3-updated', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3-updated', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4 (updated)', url: 'http://site1/link4', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@5', title: 'Title 5', date: new Date('2016-06-11T10:34:00.000Z'), contents: 'Text 5', url: 'http://site1/link5', FeedUrl: 'http://sites-site1.com' }
        ]);
        assert.deepEqual(feeds[1].FeedItems, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1', FeedUrl: 'http://updates-site2.com' }
        ]);
        done();
      }).catch(done);
    });
    it('should handle connection failures when polling an RSS feed', function (done) {
      var config;
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var startDate, failPollStartDate, failPollEndDate, finalPollStartDate, endDate;
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
        return user.save();
      }).then(function() {
        startDate = new Date();
        return feed.update();
      }).then(function() {
        failPollStartDate = new Date();
        return feed.update();
      }).then(function() {
        failPollEndDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          assert.equal(feed.createdAt >= startDate, true);
          assert.equal(feed.updatedAt >= startDate, true);
          assert.equal(feed.createdAt <= failPollStartDate, true);
          assert.equal(feed.updatedAt <= failPollStartDate, true);
          feed = feed.toJSON();
          feed.FeedItems.forEach(function(feedItem){
            assert.equal(feedItem.createdAt >= startDate, true);
            assert.equal(feedItem.updatedAt >= startDate, true);
            assert.equal(feedItem.createdAt <= failPollStartDate, true);
            assert.equal(feedItem.updatedAt <= failPollEndDate, true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= failPollStartDate, true);
              delete feedItem.date;
            }
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].FeedItems, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2', contents: 'Text 2', url: 'http://site1/link2', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4', url: 'http://site1/link4', FeedUrl: 'http://sites-site1.com' }
        ]);
        assert.deepEqual(feeds[1].FeedItems, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1', FeedUrl: 'http://updates-site2.com' }
        ]);
        finalPollStartDate = new Date();
        return feed.update();
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
        assert.equal(feeds.length, 2);
        feeds = feeds.map(function(feed) {
          assert.equal(feed.createdAt >= startDate, true);
          assert.equal(feed.updatedAt >= startDate, true);
          assert.equal(feed.createdAt <= failPollStartDate, true);
          assert.equal(feed.updatedAt <= failPollStartDate, true);
          feed = feed.toJSON();
          feed.FeedItems.forEach(function(feedItem){
            assert.equal(feedItem.createdAt >= startDate, true);
            assert.equal(feedItem.updatedAt >= finalPollStartDate, true);
            assert.equal(feedItem.createdAt <= failPollStartDate, true);
            assert.equal(feedItem.updatedAt <= endDate, true);
            if(feedItem.url === 'http://site1/link2'){
              //No date in this item
              assert.equal(feedItem.date >= startDate, true);
              assert.equal(feedItem.date <= (feedItem.url === 'http://site1/link2' ? endDate : failPollStartDate), true);
              delete feedItem.date;
            }
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
          return feed;
        });
        assert.equal(feeds[0].url, feedFiles[0].url);
        assert.equal(feeds[1].url, feedFiles[1].url);
        assert.deepEqual(feeds[0].FeedItems, [
          { guid: 'http://sites-site1.com@@Item@1', title: 'Title 1', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Text 1', url: 'http://site1/link1', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@2', title: 'Title 2', contents: 'Text 2', url: 'http://site1/link2', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@http://site1/link3', title: 'Title 3', date: new Date('2016-06-07T13:19:00.000Z'), contents: 'Text 3', url: 'http://site1/link3', FeedUrl: 'http://sites-site1.com' },
          { guid: 'http://sites-site1.com@@Item@4', title: 'Title 4', date: new Date('2016-06-08T10:34:00.000Z'), contents: 'Content 4', url: 'http://site1/link4', FeedUrl: 'http://sites-site1.com' }
        ]);
        assert.deepEqual(feeds[1].FeedItems, [
          { guid: 'http://updates-site2.com@@Item@1', title: 'Title 1', date: new Date('2016-06-10T10:34:00.000Z'), contents: 'Text 1', url: 'http://site2/link1', FeedUrl: 'http://updates-site2.com' }
        ]);
        done();
      }).catch(done);
    });
  });
});
