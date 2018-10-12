var fs = require('fs');
var path = require('path');
var assert = require('assert');
var nock = require('nock');

var dbConfiguration = require('./utils/dbconfiguration');
var createLoadFile = require('./utils/loadfile');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
require('./utils/logging');

var loadFile = createLoadFile('fetcher');

describe('Fetcher', function() {
  beforeEach(function() {
    logger.info(this.currentTest.fullTitle());
    dbConfiguration.reconfigureDb();
    return persistence.init({force: true});
  });

  afterEach(function() {
    return persistence.close();
  });

  describe('pagemonitor', function() {
    it('should poll newly added pages', async function () {
      //this.timeout(60000);
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var pageFiles = await Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      }));
      pages.forEach(function(page, i) {
        nock(page.url).get('/').once().reply(200, pageFiles[i]);
      });
      var config = await loadFile('pagemonitor.xml');
      var user = await persistence.getUserData();
      user.pagemonitor = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await pagemonitor.update();
      var endDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();

      assert.equal(pageMonitorItems.length, 2);
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        assert.equal(pageMonitorItem.createdAt >= userSaveStartDate, true);
        assert.equal(pageMonitorItem.updatedAt >= startDate, true);
        assert.equal(pageMonitorItem.createdAt <= startDate, true);
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
    });
    it('should handle updates with changes in unmonitored sections', async function () {
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'},
        {url: 'https://site1.com', file: 'page1_update_unmonitored.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var pageFiles = await Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      }));
      pages.forEach(function(page, i) {
        nock(page.url).get('/').once().reply(200, pageFiles[i]);
      });
      var config = await loadFile('pagemonitor.xml');
      var user = await persistence.getUserData();
      user.pagemonitor = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await pagemonitor.update();
      var secondPollDate = new Date();
      await pagemonitor.update();
      var endDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();

      assert.equal(pageMonitorItems.length, 2);
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        assert.equal(pageMonitorItem.createdAt >= userSaveStartDate, true);
        assert.equal(pageMonitorItem.updatedAt >= startDate, true);
        assert.equal(pageMonitorItem.createdAt <= startDate, true);
        assert.equal(pageMonitorItem.updatedAt <= secondPollDate, true);
        return pageMonitorItem.toJSON();
      });
      assert.equal(pageMonitorItems[0].url, pages[0].url);
      assert.equal(pageMonitorItems[1].url, pages[1].url);
      assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
      assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
      assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');
      assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
    });
    it('should handle updates with changes in monitored sections', async function () {
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'},
        {url: 'https://site1.com', file: 'page1_update_monitored.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var pageFiles = await Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      }));
      pages.forEach(function(page, i) {
        nock(page.url).get('/').once().reply(200, pageFiles[i]);
      });
      var config = await loadFile('pagemonitor.xml');
      var user = await persistence.getUserData();
      user.pagemonitor = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await pagemonitor.update();
      var secondPollDate = new Date();
      await pagemonitor.update();
      var endDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();

      assert.equal(pageMonitorItems.length, 2);
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        assert.equal(pageMonitorItem.createdAt >= userSaveStartDate, true);
        assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === pages[0].url ? secondPollDate : startDate), true);
        assert.equal(pageMonitorItem.createdAt <= startDate, true);
        assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === pages[0].url ? endDate : secondPollDate), true);
        return pageMonitorItem.toJSON();
      });
      assert.equal(pageMonitorItems[0].url, pages[0].url);
      assert.equal(pageMonitorItems[1].url, pages[1].url);
      assert.equal(pageMonitorItems[0].delta, '@@ -1,5 +1,5 @@\n \n \n-Some text\n Another line\n+New content\n \n');
      assert.equal(pageMonitorItems[1].delta, '@@ -1,1 +1,1 @@\n-\n+Page 2 text\n');
      assert.equal(pageMonitorItems[0].contents, '\n\nAnother line\nNew content\n');
      assert.equal(pageMonitorItems[1].contents, 'Page 2 text');
    });
    it('should handle connection failures when polling a page', async function () {
      var pages = [
        {url: 'https://site1.com', file: 'page1.html'},
        {url: 'http://site2.com', file: 'page2.txt'}
      ];
      var errorMessage = 'Error when fetching page: Access denied';
      var pageFiles = await Promise.all(pages.map(function(page) {
        return loadFile(page.file);
      }));
      pages.forEach(function(page, i) {
        nock(page.url).get('/').once().reply(200, pageFiles[i]);
      });
      nock(pages[0].url).get('/').once().replyWithError('Access denied');
      nock(pages[1].url).get('/').once().reply(200, pageFiles[1]);
      pages.forEach(function(page, i) {
        nock(page.url).get('/').once().reply(200, pageFiles[i]);
      });
      var config = await loadFile('pagemonitor.xml');
      var user = await persistence.getUserData();
      user.pagemonitor = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await pagemonitor.update();
      var failPollStartDate = new Date();
      await pagemonitor.update();
      var failPollEndDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();

      assert.equal(pageMonitorItems.length, 2);
      assert.equal(pageMonitorItems[0].updatedAt >= failPollStartDate, true);
      assert.equal(pageMonitorItems[0].updatedAt <= failPollEndDate, true);
      assert.equal(pageMonitorItems[0].url, pages[0].url);
      assert.equal(pageMonitorItems[0].error, errorMessage);
      assert.equal(pageMonitorItems[0].delta, '@@ -1,1 +1,5 @@\n \n+\n+Some text\n+Another line\n+\n');
      assert.equal(pageMonitorItems[0].contents, '\n\nSome text\nAnother line\n');

      var finalPollStartDate = new Date();
      await pagemonitor.update();
      var endDate = new Date();
      pageMonitorItems = await persistence.getPageMonitorItems();

      assert.equal(pageMonitorItems.length, 2);
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        assert.equal(pageMonitorItem.createdAt >= userSaveStartDate, true);
        assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === pages[0].url ? finalPollStartDate : startDate), true);
        assert.equal(pageMonitorItem.createdAt <= startDate, true);
        assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === pages[0].url ? endDate : failPollStartDate), true);
        return pageMonitorItem.toJSON();
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

  describe('feed', function() {
    it('should poll newly added RSS feeds', async function () {
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var loadedFiles = await Promise.all(feedFiles.map(function(feedFile) {
        return loadFile(feedFile.file);
      }));
      feedFiles.forEach(function(feedFile, i) {
        nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
      });
      var config = await loadFile('opml_two.xml');
      var user = await persistence.getUserData();
      user.opml = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await feed.update();
      var endDate = new Date();
      var feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        assert.equal(feed.createdAt >= userSaveStartDate, true);
        assert.equal(feed.updatedAt >= userSaveStartDate, true);
        assert.equal(feed.createdAt <= startDate, true);
        assert.equal(feed.updatedAt <= startDate, true);
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
    });
    it('should poll newly added Atom feeds', async function () {
      var loadedFile = await loadFile('atom.xml');
      nock('http://sites-site1.com').get('/').once().reply(200, loadedFile);
      var config = await loadFile('opml_one.xml');
      var user = await persistence.getUserData();
      user.opml = config;
      var userSaveStartDate = new Date();
      var user = await user.save();

      var startDate = new Date();
      await feed.update();
      var endDate = new Date();
      var feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 1);
      feeds = feeds.map(function(feed) {
        assert.equal(feed.createdAt >= userSaveStartDate, true);
        assert.equal(feed.updatedAt >= userSaveStartDate, true);
        assert.equal(feed.createdAt <= startDate, true);
        assert.equal(feed.updatedAt <= startDate, true);
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
    });
    it('should poll newly added RDF feeds', async function () {
      var loadedFile = await loadFile('rdf.xml');
      nock('http://sites-site1.com').get('/').once().reply(200, loadedFile);
      var config = await loadFile('opml_one.xml');
      var user = await persistence.getUserData();
      user.opml = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await feed.update();
      var endDate = new Date();
      var feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 1);
      feeds = feeds.map(function(feed) {
        assert.equal(feed.createdAt >= userSaveStartDate, true);
        assert.equal(feed.updatedAt >= userSaveStartDate, true);
        assert.equal(feed.createdAt <= startDate, true);
        assert.equal(feed.updatedAt <= startDate, true);
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
    });
    it('should handle updates to RSS feeds', async function () {
      this.timeout(4000);
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'},
        {url: 'http://sites-site1.com', file: 'rss1_updated.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var notUpdatedLinks = ['http://site1/link1', 'http://site1/link3'];
      var newItems = ['http://site1/link3-updated', 'http://site1/link5'];
      var loadedFiles = await Promise.all(feedFiles.map(function(feedFile) {
        return loadFile(feedFile.file);
      }));
      feedFiles.forEach(function(feedFile, i) {
        nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
      });
      var config = await loadFile('opml_two.xml');
      var user = await persistence.getUserData();
      user.opml = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await feed.update();
      var updateDate = new Date();
      await feed.update();

      var endDate = new Date();
      var feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        assert.equal(feed.createdAt >= userSaveStartDate, true);
        assert.equal(feed.updatedAt >= userSaveStartDate, true);
        assert.equal(feed.createdAt <= startDate, true);
        assert.equal(feed.updatedAt <= startDate, true);
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
    });
    it('should handle connection failures when polling an RSS feed', async function () {
      this.timeout(4000);
      var feedFiles = [
        {url: 'http://sites-site1.com', file: 'rss1.xml'},
        {url: 'http://updates-site2.com', file: 'rss2.xml'}
      ];
      var loadedFiles = await Promise.all(feedFiles.map(function(feedFile) {
        return loadFile(feedFile.file);
      }));
      feedFiles.forEach(function(feedFile, i) {
        nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
      });
      nock(feedFiles[0].url).get('/').once().replyWithError('Access denied');
      nock(feedFiles[1].url).get('/').once().reply(200, feedFiles[1]);
      feedFiles.forEach(function(feedFile, i) {
        nock(feedFile.url).get('/').once().reply(200, loadedFiles[i]);
      });
      var config = await loadFile('opml_two.xml');
      var user = await persistence.getUserData();
      user.opml = config;
      var userSaveStartDate = new Date();
      user = await user.save();

      var startDate = new Date();
      await feed.update();
      var failPollStartDate = new Date();
      await feed.update();

      var failPollEndDate = new Date();
      var feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        assert.equal(feed.createdAt >= userSaveStartDate, true);
        assert.equal(feed.updatedAt >= userSaveStartDate, true);
        assert.equal(feed.createdAt <= startDate, true);
        assert.equal(feed.updatedAt <= startDate, true);
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

      var finalPollStartDate = new Date();
      await feed.update();
      var endDate = new Date();
      feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        assert.equal(feed.createdAt >= userSaveStartDate, true);
        assert.equal(feed.updatedAt >= userSaveStartDate, true);
        assert.equal(feed.createdAt <= startDate, true);
        assert.equal(feed.updatedAt <= startDate, true);
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
    });
  });
});
