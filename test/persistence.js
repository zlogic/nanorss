var assert = require('assert');
var fs = require('fs');
var path = require('path');

var dbConfiguration = require('./utils/dbconfiguration');
var createLoadFile = require('./utils/loadfile');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
require('./utils/logging');

var loadFile = createLoadFile('persistence');

describe('Persistence', function() {
  beforeEach(function() {
    logger.info(this.currentTest.fullTitle());
    dbConfiguration.reconfigureDb();
    return persistence.init({force: true});
  });

  afterEach(function() {
    return persistence.close();
  });

  describe('user', function () {
    it('should create a new user with an empty database', async function () {
      var user = await persistence.getUserData();
      assert.equal(user.username, 'default');
    });
    it('should be able to change user preferences', async function () {
      var user = await persistence.getUserData();
      assert.equal(user.username, 'default');
      user.password = 'pass';
      user.opml = '<opml/>';
      user.pagemonitor = '<pagemonitor/>';
      user = await user.save();

      user = await persistence.getUserData()
      assert.equal(user.username, 'default');
      assert.equal(user.opml, '<opml/>');
      assert.equal(user.pagemonitor, '<pagemonitor/>');
      var passwordValid = await user.verifyPassword('pass');
      assert.equal(passwordValid, true);
    });
  });

  describe('pagemonitor', function () {
    it('should be able to save a page monitor item', async function () {
      var savePageMonitorItem = {
        url: 'http://item',
        contents: 'contents',
        delta: 'delta',
        error: null,
        flags: null,
        match: null,
        replace: null,
        title: 'Item 1'
      };
      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor_1_item.xml');
      user.pagemonitor = config;
      startDate = new Date();
      user = await user.save();

      var startSaveDate = new Date();
      savePageMonitorItem.UserId = user.id;
      var pageMonitorItems = await persistence.getPageMonitorItems();
      assert.equal(pageMonitorItems.length, 1);
      pageMonitorItems[0].contents = savePageMonitorItem.contents;
      pageMonitorItems[0].delta = savePageMonitorItem.delta;

      var pageMonitorItem = await pageMonitorItems[0].save();
      var endDate = new Date();
      pageMonitorItem = pageMonitorItem.toJSON();
      assert.equal(pageMonitorItem.createdAt >= startDate, true);
      assert.equal(pageMonitorItem.updatedAt >= startSaveDate, true);
      assert.equal(pageMonitorItem.createdAt <= startSaveDate, true);
      assert.equal(pageMonitorItem.updatedAt <= endDate, true);
      delete pageMonitorItem.createdAt;
      delete pageMonitorItem.updatedAt;
      delete pageMonitorItem.id;
      assert.deepEqual(pageMonitorItem, savePageMonitorItem);
    });
    it('should be able to read all saved page monitor items', async function () {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1', title: 'Item 1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2', title: 'Item 2' }];
      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor_2_items.xml');
      user.pagemonitor = config;
      var startDate = new Date();
      user = await user.save();

      var startSaveDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();
      pageMonitorItems.forEach(function(pageMonitorItem) {
        var savePageMonitorItem = savePageMonitorItems.find(function(savePageMonitorItem){ return savePageMonitorItem.url === pageMonitorItem.url; })
        pageMonitorItem.contents = savePageMonitorItem.contents;
        pageMonitorItem.delta = savePageMonitorItem.delta;
        savePageMonitorItem.flags = null;
        savePageMonitorItem.match = null;
        savePageMonitorItem.replace = null;
        savePageMonitorItem.error = null;
        savePageMonitorItem.UserId = user.id;
        savePageMonitorItem.id = pageMonitorItem.id;
      })
      await Promise.all(pageMonitorItems.map(function(pageMonitorItem) {return pageMonitorItem.save();}));
      endDate = new Date();

      var pageMonitorItems = await persistence.getPageMonitorItems();
      assert.equal(pageMonitorItems.length, 2);
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        pageMonitorItem = pageMonitorItem.toJSON();
        assert.equal(pageMonitorItem.createdAt >= startDate, true);
        assert.equal(pageMonitorItem.updatedAt >= startSaveDate, true);
        assert.equal(pageMonitorItem.createdAt <= startSaveDate, true);
        assert.equal(pageMonitorItem.updatedAt <= endDate, true);
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        return pageMonitorItem;
      });
      assert.deepEqual(pageMonitorItems, savePageMonitorItems);
    });
    it('should be able to update a saved page monitor item', async function () {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1', title: 'Item 1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2', title: 'Item 2' }];
      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor_2_items.xml');
      user.pagemonitor = config;
      startDate = new Date();
      user = await user.save();

      var startSaveDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();
      pageMonitorItems.forEach(function(pageMonitorItem) {
        var savePageMonitorItem = savePageMonitorItems.find(function(savePageMonitorItem){ return savePageMonitorItem.url === pageMonitorItem.url; })
        pageMonitorItem.contents = savePageMonitorItem.contents;
        pageMonitorItem.delta = savePageMonitorItem.delta;
        savePageMonitorItem.flags = null;
        savePageMonitorItem.match = null;
        savePageMonitorItem.replace = null;
        savePageMonitorItem.error = null;
        savePageMonitorItem.UserId = user.id;
        savePageMonitorItem.id = pageMonitorItem.id;
      })
      await Promise.all(pageMonitorItems.map(function(pageMonitorItem) {return pageMonitorItem.save();}));

      var endDate = new Date();
      pageMonitorItems = await persistence.getPageMonitorItems();
      assert.equal(pageMonitorItems.length, 2);
      var checkPageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        pageMonitorItem = pageMonitorItem.toJSON();
        assert.equal(pageMonitorItem.createdAt >= startDate, true);
        assert.equal(pageMonitorItem.updatedAt >= startSaveDate, true);
        assert.equal(pageMonitorItem.createdAt <= startSaveDate, true);
        assert.equal(pageMonitorItem.updatedAt <= endDate, true);
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        return pageMonitorItem;
      });
      assert.deepEqual(checkPageMonitorItems, savePageMonitorItems);
      savePageMonitorItems[0].contents = 'contents1-updated';
      savePageMonitorItems[0].delta = 'delta1-updated';
      var pageMonitorItem = pageMonitorItems.find(function(pageMonitorItem){ return pageMonitorItem.url === savePageMonitorItems[0].url; })
      pageMonitorItem.contents = savePageMonitorItems[0].contents;
      pageMonitorItem.delta = savePageMonitorItems[0].delta;

      var updateStartDate = new Date();
      await pageMonitorItem.save();
      updateEndDate = new Date();
      pageMonitorItems = await persistence.getPageMonitorItems();

      assert.equal(pageMonitorItems.length, 2);
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        pageMonitorItem = pageMonitorItem.toJSON();
        assert.equal(pageMonitorItem.createdAt >= startDate, true);
        assert.equal(pageMonitorItem.createdAt <= startSaveDate, true);
        assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === 'http://item1' ? updateStartDate : startSaveDate), true);
        assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === 'http://item1' ? updateEndDate : endDate), true);
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        return pageMonitorItem;
      });
      assert.deepEqual(pageMonitorItems, savePageMonitorItems);
    });
    it('should be able to read a specific saved page monitor item', async function () {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1', title: 'Item 1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2', title: 'Item 2' }];
      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor_2_items.xml');
      user.pagemonitor = config;
      var startDate = new Date();
      user = await user.save();

      startSaveDate = new Date();
      var pageMonitorItems = await persistence.getPageMonitorItems();
      pageMonitorItems.forEach(function(pageMonitorItem) {
        var savePageMonitorItem = savePageMonitorItems.find(function(savePageMonitorItem){ return savePageMonitorItem.url === pageMonitorItem.url; })
        pageMonitorItem.contents = savePageMonitorItem.contents;
        pageMonitorItem.delta = savePageMonitorItem.delta;
        savePageMonitorItem.flags = null;
        savePageMonitorItem.match = null;
        savePageMonitorItem.replace = null;
        savePageMonitorItem.error = null;
        savePageMonitorItem.UserId = user.id;
        savePageMonitorItem.id = pageMonitorItem.id;
      })
      await Promise.all(pageMonitorItems.map(function(pageMonitorItem) {return pageMonitorItem.save();}));

      var pageMonitorItem = await persistence.findPageMonitorItem('http://item1', 'url');
      var endDate = new Date();
      pageMonitorItem = pageMonitorItem.toJSON();
      assert.equal(pageMonitorItem.createdAt >= startDate, true);
      assert.equal(pageMonitorItem.updatedAt >= startSaveDate, true);
      assert.equal(pageMonitorItem.createdAt <= startSaveDate, true);
      assert.equal(pageMonitorItem.updatedAt <= endDate, true);
      delete pageMonitorItem.createdAt;
      delete pageMonitorItem.updatedAt;
      assert.deepEqual(pageMonitorItem, savePageMonitorItems[0]);
    });
    it('should not be able to read a non-existing page monitor item', async function () {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1', title: 'Item 1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2', title: 'Item 2' }];
      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor_2_items.xml');
      user.pagemonitor = config;
      var user = await user.save();

      pageMonitorItems = await persistence.getPageMonitorItems();
      pageMonitorItems.forEach(function(pageMonitorItem) {
        var savePageMonitorItem = savePageMonitorItems.find(function(savePageMonitorItem){ return savePageMonitorItem.url === pageMonitorItem.url; })
        pageMonitorItem.contents = savePageMonitorItem.contents;
        pageMonitorItem.delta = savePageMonitorItem.delta;
        savePageMonitorItem.flags = null;
        savePageMonitorItem.match = null;
        savePageMonitorItem.replace = null;
        savePageMonitorItem.error = null;
        savePageMonitorItem.UserId = user.id;
        savePageMonitorItem.id = pageMonitorItem.id;
      })
      await Promise.all(pageMonitorItems.map(function(pageMonitorItem) {return pageMonitorItem.save();}));

      var pageMonitorItem = await persistence.findPageMonitorItem('http://item3', 'url');
      assert.equal(pageMonitorItem, null);
    });
  });

  describe('feed', function () {
    it('should be able to save a feed', async function () {
      var saveFeedItems = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var startDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems)
      var endDate = new Date();

      var feedItems = await persistence.getFeedItems();
      feedItems = feedItems.map(function(feedItem) {
        feedItem = feedItem.toJSON();
        assert.equal(feedItem.createdAt >= startDate, true);
        assert.equal(feedItem.updatedAt >= startDate, true);
        assert.equal(feedItem.createdAt <= endDate, true);
        assert.equal(feedItem.updatedAt <= endDate, true);
        delete feedItem.createdAt;
        delete feedItem.updatedAt;
        delete feedItem.id;
        delete feedItem.Feed;
        return feedItem;
      });
      feedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
      saveFeedItems.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      assert.deepEqual(feedItems, saveFeedItems);
    });
    it('should be able to read all saved feed items', async function () {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1)
      await persistence.saveFeed('http://feed2', saveFeedItems2);
      var endDate = new Date();

      var feedItems = await persistence.getFeedItems();
      assert.equal(feedItems.length, 4);
      feedItems = feedItems.map(function(feedItem) {
        feedItem = feedItem.toJSON();
        assert.equal(feedItem.createdAt >= startDate, true);
        assert.equal(feedItem.updatedAt >= startDate, true);
        assert.equal(feedItem.createdAt <= endDate, true);
        assert.equal(feedItem.updatedAt <= endDate, true);
        assert.equal(feedItem.Feed.createdAt >= startDate, true);
        assert.equal(feedItem.Feed.updatedAt >= startDate, true);
        assert.equal(feedItem.Feed.createdAt <= endDate, true);
        assert.equal(feedItem.Feed.updatedAt <= endDate, true);
        var feedUrl = feedItem.url.match(/^(http:\/\/[^\/]+)\/.*$/)[1];
        assert.equal(feedItem.Feed.url, feedUrl);
        delete feedItem.createdAt;
        delete feedItem.updatedAt;
        delete feedItem.id;
        delete feedItem.Feed;
        return feedItem;
      });
      feedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
      saveFeedItems1.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      saveFeedItems2.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed2'; });
      assert.deepEqual(feedItems, saveFeedItems1.concat(saveFeedItems2));
    });
    it('should be able to read all saved feeds', async function () {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1);
      await persistence.saveFeed('http://feed2', saveFeedItems2);
      var endDate = new Date();

      var feeds = await persistence.getFeeds();
      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        feed = feed.toJSON();
        assert.equal(feed.createdAt >= startDate, true);
        assert.equal(feed.updatedAt >= startDate, true);
        assert.equal(feed.createdAt <= endDate, true);
        assert.equal(feed.updatedAt <= endDate, true);
        feed.FeedItems.forEach(function(feedItem){
          assert.equal(feedItem.createdAt >= startDate, true);
          assert.equal(feedItem.updatedAt >= startDate, true);
          assert.equal(feedItem.createdAt <= endDate, true);
          assert.equal(feedItem.updatedAt <= endDate, true);
          var feedUrl = feedItem.url.match(/^(http:\/\/[^\/]+)\/.*$/)[1];
          assert.equal(feedUrl, feed.url);
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
        });
        delete feed.createdAt;
        delete feed.updatedAt;
        feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
        return feed;
      });
      saveFeedItems1.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      saveFeedItems2.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed2'; });
      assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
    });
    it('should be able to update a saved feed item', async function () {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1);
      await persistence.saveFeed('http://feed2', saveFeedItems2);
      var endDate = new Date();

      var feeds = await persistence.getFeeds();
      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        feed = feed.toJSON();
        assert.equal(feed.createdAt >= startDate, true);
        assert.equal(feed.updatedAt >= startDate, true);
        assert.equal(feed.createdAt <= endDate, true);
        assert.equal(feed.updatedAt <= endDate, true);
        feed.FeedItems.forEach(function(feedItem){
          if(feedItem.url === saveFeedItems1[0].url)
            item1Id = feedItem.id;
          assert.equal(feedItem.createdAt >= startDate, true);
          assert.equal(feedItem.updatedAt >= startDate, true);
          assert.equal(feedItem.createdAt <= endDate, true);
          assert.equal(feedItem.updatedAt <= endDate, true);
          var feedUrl = feedItem.url.match(/^(http:\/\/[^\/]+)\/.*$/)[1];
          assert.equal(feedUrl, feed.url);
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
        });
        delete feed.createdAt;
        delete feed.updatedAt;
        feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
        return feed;
      });
      saveFeedItems1.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      saveFeedItems2.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed2'; });
      assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
      saveFeedItems1[0].title = 'Title 1-updated';
      saveFeedItems1[0].date = new Date('2015-01-01T12:34:56');
      saveFeedItems1[0].contents = 'Contents 1-updated';
      saveFeedItems1[0].url = 'http://feed1/item1-updated';
      saveFeedItems1.forEach(function(saveFeedItem){ delete saveFeedItem.FeedUrl; });

      var updateStartDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1);
      updateEndDate = new Date();

      var feeds = await persistence.getFeeds();

      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        feed = feed.toJSON();
        assert.equal(feed.createdAt >= startDate, true);
        assert.equal(feed.updatedAt >= startDate, true);
        assert.equal(feed.createdAt <= endDate, true);
        assert.equal(feed.updatedAt <= endDate, true);
        feed.FeedItems.forEach(function(feedItem){
          var feedUrl = feedItem.url.match(/^(http:\/\/[^\/]+)\/.*$/)[1];
          assert.equal(feedItem.createdAt >= startDate, true);
          assert.equal(feedItem.updatedAt >= (feed.url === 'http://feed1' ? updateStartDate : startDate), true);
          assert.equal(feedItem.createdAt <= endDate, true);
          assert.equal(feedItem.updatedAt <= (feed.url === 'http://feed1' ? updateEndDate : endDate), true);
          assert.equal(feedUrl, feed.url);
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
        });
        delete feed.createdAt;
        delete feed.updatedAt;
        feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
        return feed;
      });
      saveFeedItems1.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
    });
    it('should be able to add items to feed', async function () {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1);
      await persistence.saveFeed('http://feed2', saveFeedItems2);
      endDate = new Date();

      var feeds = await persistence.getFeeds();
      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        feed = feed.toJSON();
        assert.equal(feed.createdAt >= startDate, true);
        assert.equal(feed.updatedAt >= startDate, true);
        assert.equal(feed.createdAt <= endDate, true);
        assert.equal(feed.updatedAt <= endDate, true);
        feed.FeedItems.forEach(function(feedItem){
          if(feedItem.url === saveFeedItems1[0].url)
            item1Id = feedItem.id;
          assert.equal(feedItem.createdAt >= startDate, true);
          assert.equal(feedItem.updatedAt >= startDate, true);
          assert.equal(feedItem.createdAt <= endDate, true);
          assert.equal(feedItem.updatedAt <= endDate, true);
          var feedUrl = feedItem.url.match(/^(http:\/\/[^\/]+)\/.*$/)[1];
          assert.equal(feedUrl, feed.url);
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
        });
        delete feed.createdAt;
        delete feed.updatedAt;
        feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
        return feed;
      });
      saveFeedItems1.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      saveFeedItems2.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed2'; });
      assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
      saveFeedItems1.push({guid: 'Guid-05', title: 'Title 5', date: new Date('2014-01-05T12:34:56'), contents: 'Contents 5', url: 'http://feed1/item5'});
      await saveFeedItems1.forEach(function(saveFeedItem){ delete saveFeedItem.FeedUrl; });

      updateStartDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1);
      var updateEndDate = new Date();

      var feeds = await persistence.getFeeds();
      assert.equal(feeds.length, 2);
      feeds = feeds.map(function(feed) {
        feed = feed.toJSON();
        assert.equal(feed.createdAt >= startDate, true);
        assert.equal(feed.updatedAt >= startDate, true);
        assert.equal(feed.createdAt <= endDate, true);
        assert.equal(feed.updatedAt <= endDate, true);
        feed.FeedItems.forEach(function(feedItem){
          var feedUrl = feedItem.url.match(/^(http:\/\/[^\/]+)\/.*$/)[1];
          assert.equal(feedItem.createdAt >= (feedItem.url === saveFeedItems1[2].url ? updateStartDate : startDate), true);
          assert.equal(feedItem.updatedAt >= (feedItem.FeedUrl === 'http://feed1' ? updateStartDate : startDate), true);
          assert.equal(feedItem.createdAt <= (feedItem.url === saveFeedItems1[2].url ? updateEndDate : endDate), true);
          assert.equal(feedItem.updatedAt <= (feedItem.FeedUrl === 'http://feed1' ? updateEndDate : endDate), true);
          assert.equal(feedUrl, feed.url);
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
        });
        delete feed.createdAt;
        delete feed.updatedAt;
        feed.FeedItems.sort(function(a, b){ return a.url.localeCompare(b.url); });
        return feed;
      });
      saveFeedItems1.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed1'; });
      saveFeedItems2.forEach(function(saveFeedItem){ saveFeedItem.FeedUrl = 'http://feed2'; });
      assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
    });
    it('should be able to read a specific saved feed item', async function () {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      await persistence.saveFeed('http://feed1', saveFeedItems1);
      await persistence.saveFeed('http://feed2', saveFeedItems2);

      var feedItems = await persistence.getFeedItems();
      var findId = feedItems.find(function(feedItem){
        return feedItem.url === saveFeedItems1[0].url;
      }).id;

      var feedItem = await persistence.findFeedItem(findId);
      endDate = new Date();
      feedItem = feedItem.toJSON();
      assert.equal(feedItem.createdAt >= startDate, true);
      assert.equal(feedItem.updatedAt >= startDate, true);
      assert.equal(feedItem.createdAt <= endDate, true);
      assert.equal(feedItem.updatedAt <= endDate, true);
      delete feedItem.createdAt;
      delete feedItem.updatedAt;
      delete feedItem.id;
      saveFeedItems1[0].FeedUrl = 'http://feed1';
      assert.deepEqual(feedItem, saveFeedItems1[0]);
    });
    it('should not be able to read a non-existing feed item', async function () {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      await persistence.saveFeed('http://feed1', saveFeedItems1)
      await persistence.saveFeed('http://feed2', saveFeedItems2);

      var feedItems = await persistence.getFeedItems();
      var maxId = Math.max.apply(null, feedItems.map(function(feedItem) {
        return feedItem.id
      }));

      var feedItem = await persistence.findFeedItem(maxId + 1);
      assert.equal(feedItem, null);
    });
  });
});
