var fs = require('fs');
var path = require('path');
var assert = require('assert');

var serviceBase = require('./utils/servicebase')
var dbConfiguration = require('./utils/dbconfiguration');
var createLoadFile = require('./utils/loadfile');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
require('./utils/logging');

var loadFile = createLoadFile('cleanup');
var sleep = serviceBase.sleep;

describe('Cleanup', function() {
  var oneSecond = 1 / (24 * 60 * 60);

  beforeEach(function() {
    logger.info(this.currentTest.fullTitle());
    dbConfiguration.reconfigureDb();
    return persistence.init({force: true});
  });

  afterEach(function() {
    delete process.env.ITEM_EXPIRE_DAYS;
    return persistence.close();
  });

  describe('pagemonitor', function () {
    it('should delete orphaned pagemonitor items', async function () {
      var expectedPageMonitorItems = [{
        url: 'https://site1.com',
        contents: 'contents1',
        delta: 'delta1',
        error: null,
        flags: "mi",
        match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*",
        replace: "$1",
        title: "Site 1"
      }];
      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor.xml')
      user.pagemonitor = config;
      user = await user.save();

      var pageMonitorItems = await user.getPageMonitorItems();
      await pageMonitorItems.find(function(pageMonitorItem){
        return pageMonitorItem.url === expectedPageMonitorItems[0].url;
      }).update({delta: expectedPageMonitorItems[0].delta, contents: expectedPageMonitorItems[0].contents});

      config = await loadFile('pagemonitor_updated.xml');
      user.pagemonitor = config;
      user = await user.save();

      await pagemonitor.cleanup();
      pageMonitorItems = await persistence.getPageMonitorItems();
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        pageMonitorItem = pageMonitorItem.toJSON();
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        delete pageMonitorItem.id;
        delete pageMonitorItem.UserId;
        return pageMonitorItem;
      });
      assert.deepEqual(pageMonitorItems, expectedPageMonitorItems);
    });

    it('should do nothing with pagemonitor items if no orphaned items were found', async function () {
      var expectedPageMonitorItems = [{
        url: 'https://site1.com',
        contents: 'contents1',
        delta: 'delta1',
        error: null,
        flags: "mi",
        match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*",
        replace: "$1",
        title: "Site 1"
      }, {
        url: 'http://site2.com',
        contents: 'contents2',
        delta: 'delta2',
        error: null,
        flags: null,
        match: null,
        replace: null,
        title: "Site 2"
      }];

      var user = await persistence.getUserData();
      var config = await loadFile('pagemonitor.xml')
      user.pagemonitor = config;
      user = await user.save();

      var pageMonitorItems = await user.getPageMonitorItems();
      await Promise.all(expectedPageMonitorItems.map(function(expectedItem){
        var update = {delta: expectedItem.delta, contents: expectedItem.contents};
        return pageMonitorItems.find(function(pageMonitorItem) {
          return pageMonitorItem.url === expectedItem.url;
        }).update(update);
      }));

      await pagemonitor.cleanup();
      pageMonitorItems = await persistence.getPageMonitorItems();
      pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
        pageMonitorItem = pageMonitorItem.toJSON();
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        delete pageMonitorItem.id;
        delete pageMonitorItem.UserId;
        return pageMonitorItem;
      });
      assert.deepEqual(pageMonitorItems, expectedPageMonitorItems);
    });
  });

  describe('feed', function () {
    it('should delete expired feed items', async function () {
      this.timeout(4000);
      process.env.ITEM_EXPIRE_DAYS = oneSecond.toString();
      var saveFeedItems = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var config = await loadFile('opml.xml')
      var user = await persistence.getUserData();
      user.opml = config;
      user = await user.save();

      await persistence.saveFeed('http://sites-site1.com', saveFeedItems);

      await sleep(1000);
      saveFeedItems.splice(1, 1);
      await persistence.saveFeed('http://sites-site1.com', saveFeedItems);

      await feed.cleanup();
      var feeds = await persistence.getFeeds();
      feeds = feeds.map(function(feed){
        feed = feed.toJSON();
        feed.FeedItems = feed.FeedItems.map(function(feedItem) {
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
          delete feedItem.Feed;
          delete feedItem.FeedUrl;
          return feedItem;
        });
        delete feed.id;
        delete feed.createdAt;
        delete feed.updatedAt;
        return feed;
      });
      assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems}, {url: 'http://updates-site2.com', FeedItems: []}]);
    });
    it('should delete expired feeds', async function () {
      this.timeout(4000);
      process.env.ITEM_EXPIRE_DAYS = oneSecond.toString();
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var config = await loadFile('opml.xml')
      var user = await persistence.getUserData();
      user.opml = config;
      user = await user.save();

      await persistence.saveFeed('http://sites-site1.com', saveFeedItems1);
      await persistence.saveFeed('http://updates-site2.com', saveFeedItems2);

      await sleep(1000);
      await persistence.saveFeed('http://sites-site1.com', saveFeedItems1);

      await feed.cleanup();
      var feeds = await persistence.getFeeds();
      feeds = feeds.map(function(feed){
        feed = feed.toJSON();
        feed.FeedItems = feed.FeedItems.map(function(feedItem) {
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
          delete feedItem.Feed;
          delete feedItem.FeedUrl;
          return feedItem;
        });
        delete feed.id;
        delete feed.createdAt;
        delete feed.updatedAt;
        return feed;
      });
      assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems1}, {url: 'http://updates-site2.com', FeedItems: []}]);
    });
    it('should delete feeds absent from configuration file', async function () {
      this.timeout(4000);
      process.env.ITEM_EXPIRE_DAYS = oneSecond.toString();
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var config = await loadFile('opml.xml')
      var user = await persistence.getUserData();
      user.opml = config;
      user = await user.save();

      await persistence.saveFeed('http://sites-site1.com', saveFeedItems1);
      await persistence.saveFeed('http://unknown-site2.com', saveFeedItems2);

      await feed.cleanup();
      var feeds = await persistence.getFeeds();
      feeds = feeds.map(function(feed){
        feed = feed.toJSON();
        feed.FeedItems = feed.FeedItems.map(function(feedItem) {
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
          delete feedItem.Feed;
          delete feedItem.FeedUrl;
          return feedItem;
        });
        delete feed.id;
        delete feed.createdAt;
        delete feed.updatedAt;
        return feed;
      });
      assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems1}, {url: 'http://updates-site2.com', FeedItems: []}]);
    });
    it('should do nothing with feed items or feeds if none have expired', async function () {
      this.timeout(4000);
      process.env.ITEM_EXPIRE_DAYS = oneSecond.toString();
      var saveFeedItems = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var config = await loadFile('opml.xml')
      var user = await persistence.getUserData();
      user.opml = config;
      user = await user.save();

      await persistence.saveFeed('http://sites-site1.com', saveFeedItems)
      await sleep(1000);

      await persistence.saveFeed('http://sites-site1.com', saveFeedItems);
      await feed.cleanup();
      var feeds = await persistence.getFeeds();
      feeds = feeds.map(function(feed){
        feed = feed.toJSON();
        feed.FeedItems = feed.FeedItems.map(function(feedItem) {
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
          delete feedItem.Feed;
          delete feedItem.FeedUrl;
          return feedItem;
        });
        delete feed.id;
        delete feed.createdAt;
        delete feed.updatedAt;
        return feed;
      });
      assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems}, {url: 'http://updates-site2.com', FeedItems: []}]);
    });
  });
});
