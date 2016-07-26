var fs = require('fs');
var path = require('path');
var assert = require('assert');

require('./utils/dbconfiguration');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
var pagemonitor = require('../lib/pagemonitor/fetcher');
var feed = require('../lib/feed/fetcher');
require('./utils/logging');

var loadFile = function(filename) {
  return new Promise(function(resolve, reject){
    fs.readFile(path.join(__dirname, 'data', 'cleanup', filename), function(error, data){
      if(error) return reject(error);
      resolve(data);
    });
  });
};

describe('Cleanup', function() {
  var oneSecond = 1 / (24 * 60 * 60);

  beforeEach(function(done) {
    logger.info(this.currentTest.fullTitle());
    return persistence.init({force: true}).then(function(){
      done();
    });
  });

  afterEach(function(done) {
    delete process.env.ITEM_EXPIRE_DAYS;
    done();
  });

  describe('pagemonitor', function () {
    it('should delete orphaned pagemonitor items', function (done) {
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
        return user.getPageMonitorItems().then(function(pageMonitorItems){
          return pageMonitorItems.find(function(pageMonitorItem){
            return pageMonitorItem.url === expectedPageMonitorItems[0].url;
          }).update({delta: expectedPageMonitorItems[0].delta, contents: expectedPageMonitorItems[0].contents});
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
          pageMonitorItem = pageMonitorItem.toJSON();
          delete pageMonitorItem.createdAt;
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem.id;
          delete pageMonitorItem.UserId;
          return pageMonitorItem;
        });
        assert.deepEqual(pageMonitorItems, expectedPageMonitorItems);
        done();
      }).catch(done);
    });

    it('should do nothing with pagemonitor items if no orphaned items were found', function (done) {
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
        flags: null,
        match: null,
        replace: null,
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
        return user.getPageMonitorItems().then(function(pageMonitorItems){
          return Promise.all(expectedPageMonitorItems.map(function(expectedItem){
            var update = {delta: expectedItem.delta, contents: expectedItem.contents};
            return pageMonitorItems.find(function(pageMonitorItem) {
              return pageMonitorItem.url === expectedItem.url;
            }).update(update);
          }));
        });
      }).then(function() {
        return pagemonitor.cleanup();
      }).then(function() {
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          pageMonitorItem = pageMonitorItem.toJSON();
          delete pageMonitorItem.createdAt;
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem.id;
          delete pageMonitorItem.UserId;
          return pageMonitorItem;
        });
        assert.deepEqual(pageMonitorItems, expectedPageMonitorItems);
        done();
      }).catch(done);
    });
  });

  describe('feed', function () {
    it('should delete expired feed items', function (done) {
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
        return persistence.getFeeds();
      }).then(function(feeds) {
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
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems}]);
        done();
      }).catch(done);
    });
    it('should delete expired feeds', function (done) {
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
        return persistence.getFeeds();
      }).then(function(feeds) {
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
        done();
      }).catch(done);
    });
    it('should delete feeds absent from configuration file', function (done) {
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
        return persistence.getFeeds();
      }).then(function(feeds) {
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
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems1}]);
        done();
      }).catch(done);
    });
    it('should do nothing with feed items or feeds if none have expired', function (done) {
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
        return persistence.getFeeds();
      }).then(function(feeds) {
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
        assert.deepEqual(feeds, [{url: 'http://sites-site1.com', FeedItems: saveFeedItems}]);
        done();
      }).catch(done);
    });
  });
});
