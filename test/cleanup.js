var fs = require('fs');
var path = require('path');
var assert = require('assert');

var createLoadFile = require('./utils/loadfile');
var persistence = require('../lib/services/persistence');
var persistencebase = require('./utils/persistencebase');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
require('./utils/logging');

var loadFile = createLoadFile('cleanup');

describe('Cleanup', function() {
  var oneSecond = 1 / (24 * 60 * 60);

  persistencebase.hooks();

  afterEach(function() {
    delete process.env.ITEM_EXPIRE_DAYS;
  });

  describe('pagemonitor', function () {
    it('should delete orphaned pagemonitor items', function () {
      var expectedPageMonitorItems = [{
        url: 'https://site1.com',
        contents: 'contents1',
        delta: 'delta1',
        flags: "mi",
        match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*",
        replace: "$1",
        title: "Site 1"
      }];
      var user;
      return persistence.getUserData().then(function(userData){
        user = userData;
        return loadFile('pagemonitor.xml').then(function(config) {
          user.pagemonitor = config;
          return user.save();
        });
      }).then(function(user) {
        return persistence.getPageMonitorItems().then(function(pageMonitorItems){
          return pageMonitorItems.find(function(pageMonitorItem){
            return pageMonitorItem.url === expectedPageMonitorItems[0].url;
          }).set({delta: expectedPageMonitorItems[0].delta, contents: expectedPageMonitorItems[0].contents}).save();
        });
      }).then(function() {
        return loadFile('pagemonitor_updated.xml').then(function(config) {
          user.pagemonitor = config;
          return user.save();
        });
      }).then(function(user) {
        return pagemonitor.cleanup();
      }).then(function() {
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          pageMonitorItem = pageMonitorItem.toObject();
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem._id;
          delete pageMonitorItem.__v;
          return pageMonitorItem;
        });
        pageMonitorItems.sort(function(a, b){ return b.url.localeCompare(a.url); });
        assert.deepEqual(pageMonitorItems, expectedPageMonitorItems);
      });
    });

    it('should do nothing with pagemonitor items if no orphaned items were found', function () {
      var expectedPageMonitorItems = [{
        url: 'https://site1.com',
        contents: 'contents1',
        delta: 'delta1',
        flags: "mi",
        match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*",
        replace: "$1",
        title: "Site 1"
      }, {
        url: 'http://site2.com',
        contents: 'contents2',
        delta: 'delta2',
        title: "Site 2"
      }];
      var user;
      return persistence.getUserData().then(function(userData){
        user = userData;
        return loadFile('pagemonitor.xml').then(function(config) {
          user.pagemonitor = config;
          return user.save();
        });
      }).then(function(user) {
        return persistence.getPageMonitorItems().then(function(pageMonitorItems){
          return Promise.all(expectedPageMonitorItems.map(function(expectedItem){
            var update = {delta: expectedItem.delta, contents: expectedItem.contents};
            return pageMonitorItems.find(function(pageMonitorItem) {
              return pageMonitorItem.url === expectedItem.url;
            }).set(update).save();
          }));
        });
      }).then(function() {
        return pagemonitor.cleanup();
      }).then(function() {
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          pageMonitorItem = pageMonitorItem.toObject();
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem._id;
          delete pageMonitorItem.__v;
          return pageMonitorItem;
        });
        pageMonitorItems.sort(function(a, b){ return b.url.localeCompare(a.url); });
        assert.deepEqual(pageMonitorItems, expectedPageMonitorItems);
      });
    });
  });

  describe('feed', function () {
    it('should delete expired feed items', function () {
      this.timeout(4000);
      process.env.ITEM_EXPIRE_DAYS = oneSecond.toString();
      var saveFeedItems = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var config;
      return loadFile('opml.xml').then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        return user.save();
      }).then(function(){
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems);
      }).then(function() {
        return new Promise(function(resolve, reject){
          setTimeout(resolve, 1000);
        });
      }).then(function() {
        saveFeedItems.splice(1, 1);
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems);
      }).then(function() {
        return feed.cleanup();
      }).then(function() {
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        feeds = feeds.map(function(feed){
          feed.items = feed.items.map(function(feedItem) {
            delete feedItem._id;
            delete feedItem.__v;
            return feedItem;
          });
          delete feed._id;
          delete feed.__v;
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', items: saveFeedItems}, {url: 'http://updates-site2.com', items: []}]);
      });
    });
    it('should delete expired feeds', function () {
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
      return loadFile('opml.xml').then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        return user.save();
      }).then(function(){
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems1);
      }).then(function(){
        return persistence.saveFeed('http://updates-site2.com', saveFeedItems2);
      }).then(function() {
        return new Promise(function(resolve, reject){
          setTimeout(resolve, 1000);
        });
      }).then(function() {
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems1);
      }).then(function() {
        return feed.cleanup();
      }).then(function() {
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        feeds = feeds.map(function(feed){
          feed.items = feed.items.map(function(feedItem) {
            delete feedItem._id;
            delete feedItem.__v;
            return feedItem;
          });
          delete feed._id;
          delete feed.__v;
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', items: saveFeedItems1}, {url: 'http://updates-site2.com', items: []}]);
      });
    });
    it('should delete feeds absent from configuration file', function () {
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
      return loadFile('opml.xml').then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        return user.save();
      }).then(function(){
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems1);
      }).then(function(){
        return persistence.saveFeed('http://unknown-site2.com', saveFeedItems2);
      }).then(function() {
        return feed.cleanup();
      }).then(function() {
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        feeds = feeds.map(function(feed){
          feed.items = feed.items.map(function(feedItem) {
            delete feedItem._id;
            delete feedItem.__v;
            return feedItem;
          });
          delete feed._id;
          delete feed.__v;
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', items: saveFeedItems1}, {url: 'http://updates-site2.com', items: []}]);
      });
    });
    it('should do nothing with feed items or feeds if none have expired', function () {
      this.timeout(4000);
      process.env.ITEM_EXPIRE_DAYS = oneSecond.toString();
      var saveFeedItems = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      return loadFile('opml.xml').then(function(data) {
        config = data;
        return persistence.getUserData();
      }).then(function(user){
        user.opml = config;
        return user.save();
      }).then(function(){
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems)
      }).then(function() {
        return new Promise(function(resolve, reject){
          setTimeout(resolve, 1000);
        });
      }).then(function() {
        return persistence.saveFeed('http://sites-site1.com', saveFeedItems);
      }).then(function() {
        return feed.cleanup();
      }).then(function() {
        return persistence.getFeeds().lean();
      }).then(function(feeds) {
        feeds = feeds.map(function(feed){
          feed.items = feed.items.map(function(feedItem) {
            delete feedItem._id;
            delete feedItem.__v;
            return feedItem;
          });
          delete feed._id;
          delete feed.__v;
          return feed;
        });
        feeds.sort(function(a, b){ return a.url.localeCompare(b.url); });
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', items: saveFeedItems}, {url: 'http://updates-site2.com', items: []}]);
      });
    });
  });
});
