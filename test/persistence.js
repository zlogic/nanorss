var fs = require('fs');
var assert = require('assert');

require('./utils/dbconfiguration.js');
var persistence = require('../lib/services/persistence');
var logger = require('../lib/services/logger').logger;
require('./utils/logging');

describe('Persistence', function() {
  beforeEach(function(done) {
    logger.info(this.currentTest.fullTitle());
    return persistence.init({force: true}).then(function(){
      done();
    });
  });

  describe('user', function () {
    it('should create a new user with an empty database', function (done) {
      return persistence.getUserData().then(function(user){
        assert.equal(user.username, 'default');
        done();
      }).catch(done);
    });
    it('should be able to change user preferences', function (done) {
      return persistence.getUserData().then(function(user){
        assert.equal(user.username, 'default');
        user.password = 'pass';
        user.opml = 'opml';
        user.pagemonitor = 'pagemonitor';
        return user.save();
      }).then(function(){
        return persistence.getUserData().then(function(user){
          assert.equal(user.username, 'default');
          assert.equal(user.password, 'pass');
          assert.equal(user.opml, 'opml');
          assert.equal(user.pagemonitor, 'pagemonitor');
          done();
        })
      }).catch(done);
    });
  });

  describe('pagemonitor', function () {
    it('should be able to save a page monitor item', function (done) {
      var savePageMonitorItem = {
        url: 'http://item',
        contents: 'contents',
        delta: 'delta'
      };
      var startDate = new Date();
      return persistence.savePageMonitorItem(savePageMonitorItem).then(function(pageMonitorItem){
        var endDate = new Date();
        pageMonitorItem = pageMonitorItem.toJSON();
        assert.equal(pageMonitorItem.createdAt >= startDate, true);
        assert.equal(pageMonitorItem.updatedAt >= startDate, true);
        assert.equal(pageMonitorItem.createdAt <= endDate, true);
        assert.equal(pageMonitorItem.updatedAt <= endDate, true);
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        delete pageMonitorItem.id;
        assert.deepEqual(pageMonitorItem, savePageMonitorItem);
        done();
      }).catch(done);
    });
    it('should be able to read all saved page monitor items', function (done) {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2' }];
      var startDate = new Date();
      var endDate;
      return Promise.all(savePageMonitorItems.map(function(savePageMonitorItem){
        return persistence.savePageMonitorItem(savePageMonitorItem);
      })).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          pageMonitorItem = pageMonitorItem.toJSON();
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt >= startDate, true);
          assert.equal(pageMonitorItem.createdAt <= endDate, true);
          assert.equal(pageMonitorItem.updatedAt <= endDate, true);
          delete pageMonitorItem.createdAt;
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem.id;
          return pageMonitorItem;
        });
        assert.deepEqual(pageMonitorItems, savePageMonitorItems);
        done();
      }).catch(done);
    });
    it('should be able to update a saved page monitor item', function (done) {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2' }];
      var startDate = new Date();
      var endDate;
      var updateStartDate;
      var updateEndDate;
      return Promise.all(savePageMonitorItems.map(function(savePageMonitorItem){
        return persistence.savePageMonitorItem(savePageMonitorItem);
      })).then(function() {
        endDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          pageMonitorItem = pageMonitorItem.toJSON();
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.updatedAt >= startDate, true);
          assert.equal(pageMonitorItem.createdAt <= endDate, true);
          assert.equal(pageMonitorItem.updatedAt <= endDate, true);
          delete pageMonitorItem.createdAt;
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem.id;
          return pageMonitorItem;
        });
        assert.deepEqual(pageMonitorItems, savePageMonitorItems);
        savePageMonitorItems[0].contents = 'contents1-updated';
        savePageMonitorItems[0].delta = 'delta1-updated';
        updateStartDate = new Date();
        return persistence.savePageMonitorItem(savePageMonitorItems[0]);
      }).then(function() {
        updateEndDate = new Date();
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems) {
        assert.equal(pageMonitorItems.length, 2);
        pageMonitorItems = pageMonitorItems.map(function(pageMonitorItem) {
          pageMonitorItem = pageMonitorItem.toJSON();
          assert.equal(pageMonitorItem.createdAt >= startDate, true);
          assert.equal(pageMonitorItem.createdAt <= endDate, true);
          assert.equal(pageMonitorItem.updatedAt >= (pageMonitorItem.url === 'http://item1' ? updateStartDate : startDate), true);
          assert.equal(pageMonitorItem.updatedAt <= (pageMonitorItem.url === 'http://item1' ? updateEndDate : endDate), true);
          delete pageMonitorItem.createdAt;
          delete pageMonitorItem.updatedAt;
          delete pageMonitorItem.id;
          return pageMonitorItem;
        });
        assert.deepEqual(pageMonitorItems, savePageMonitorItems);
        done();
      }).catch(done);
    });
    it('should be able to read a specific saved page monitor item', function (done) {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2' }];
      var startDate = new Date();
      var endDate;
      return Promise.all(savePageMonitorItems.map(function(savePageMonitorItem){
        return persistence.savePageMonitorItem(savePageMonitorItem);
      })).then(function() {
        endDate = new Date();
        return persistence.findPageMonitorItem('http://item1', 'url');
      }).then(function(pageMonitorItem) {
        var endDate = new Date();
        pageMonitorItem = pageMonitorItem.toJSON();
        assert.equal(pageMonitorItem.createdAt >= startDate, true);
        assert.equal(pageMonitorItem.updatedAt >= startDate, true);
        assert.equal(pageMonitorItem.createdAt <= endDate, true);
        assert.equal(pageMonitorItem.updatedAt <= endDate, true);
        delete pageMonitorItem.createdAt;
        delete pageMonitorItem.updatedAt;
        delete pageMonitorItem.id;
        assert.deepEqual(pageMonitorItem, savePageMonitorItems[0]);
        done();
      }).catch(done);
    });
    it('should not be able to read a non-existing page monitor item', function (done) {
      var savePageMonitorItems = [{ url: 'http://item1', contents: 'contents1', delta: 'delta1' }, { url: 'http://item2', contents: 'contents2', delta: 'delta2' }];
      return Promise.all(savePageMonitorItems.map(function(savePageMonitorItem){
        return persistence.savePageMonitorItem(savePageMonitorItem);
      })).then(function() {
        return persistence.findPageMonitorItem('http://item3', 'url');
      }).then(function(pageMonitorItem) {
        assert.equal(pageMonitorItem, null);
        done();
      }).catch(done);
    });
  });

  describe('feed', function () {
    it('should be able to save a feed', function (done) {
      var saveFeedItems = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var startDate = new Date();
      return persistence.saveFeed('http://feed1', saveFeedItems).then(function(feedItems){
        var endDate = new Date();
        feedItems = feedItems.map(function(feedItem) {
          feedItem = feedItem.toJSON();
          assert.equal(feedItem.createdAt >= startDate, true);
          assert.equal(feedItem.updatedAt >= startDate, true);
          assert.equal(feedItem.createdAt <= endDate, true);
          assert.equal(feedItem.updatedAt <= endDate, true);
          delete feedItem.createdAt;
          delete feedItem.updatedAt;
          delete feedItem.id;
          return feedItem;
        });
        assert.deepEqual(feedItems, saveFeedItems);
        done();
      }).catch(done);
    });
    it('should be able to read all saved feed items', function (done) {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      var endDate;
      return persistence.saveFeed('http://feed1', saveFeedItems1).then(function(){
        return persistence.saveFeed('http://feed2', saveFeedItems2);
      }).then(function() {
        endDate = new Date();
        return persistence.getFeedItems();
      }).then(function(feedItems) {
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
        assert.deepEqual(feedItems, saveFeedItems1.concat(saveFeedItems2));
        done();
      }).catch(done);
    });
    it('should be able to read all saved feeds', function (done) {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      var endDate;
      return persistence.saveFeed('http://feed1', saveFeedItems1).then(function(){
        return persistence.saveFeed('http://feed2', saveFeedItems2);
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
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
          return feed;
        });
        assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
        done();
      }).catch(done);
    });
    it('should be able to update a saved feed item', function (done) {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      var endDate;
      var updateStartDate;
      var updateEndDate;
      var item1Id;
      return persistence.saveFeed('http://feed1', saveFeedItems1).then(function(){
        return persistence.saveFeed('http://feed2', saveFeedItems2);
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
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
          return feed;
        });
        assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
        saveFeedItems1[0].title = 'Title 1-updated';
        saveFeedItems1[0].date = new Date('2015-01-01T12:34:56');
        saveFeedItems1[0].contents = 'Contents 1-updated';
        saveFeedItems1[0].url = 'http://feed1/item1-updated';
        updateStartDate = new Date();
        return persistence.saveFeed('http://feed1', saveFeedItems1);
      }).then(function() {
        updateEndDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
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
            assert.equal(feedItem.updatedAt >= (feedItem.url === saveFeedItems1[0].url ? updateStartDate : startDate), true);
            assert.equal(feedItem.createdAt <= endDate, true);
            assert.equal(feedItem.updatedAt <= (feedItem.url === saveFeedItems1[0].url ? updateEndDate : endDate), true);
            assert.equal(feedUrl, feed.url);
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          delete feed.createdAt;
          delete feed.updatedAt;
          return feed;
        });
        assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
        done();
      }).catch(done);
    });
    it('should be able to add items to feed', function (done) {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      var endDate;
      var updateStartDate;
      var updateEndDate;
      var item1Id;
      return persistence.saveFeed('http://feed1', saveFeedItems1).then(function(){
        return persistence.saveFeed('http://feed2', saveFeedItems2);
      }).then(function() {
        endDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
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
          return feed;
        });
        assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
        saveFeedItems1.push({guid: 'Guid-05', title: 'Title 5', date: new Date('2014-01-05T12:34:56'), contents: 'Contents 5', url: 'http://feed1/item5'});
        updateStartDate = new Date();
        return persistence.saveFeed('http://feed1', saveFeedItems1);
      }).then(function() {
        updateEndDate = new Date();
        return persistence.getFeeds();
      }).then(function(feeds) {
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
            assert.equal(feedItem.updatedAt >= (feedItem.url === saveFeedItems1[2].url ? updateStartDate : startDate), true);
            assert.equal(feedItem.createdAt <= (feedItem.url === saveFeedItems1[2].url ? updateEndDate : endDate), true);
            assert.equal(feedItem.updatedAt <= (feedItem.url === saveFeedItems1[2].url ? updateEndDate : endDate), true);
            assert.equal(feedUrl, feed.url);
            delete feedItem.createdAt;
            delete feedItem.updatedAt;
            delete feedItem.id;
          });
          delete feed.createdAt;
          delete feed.updatedAt;
          return feed;
        });
        assert.deepEqual(feeds, [{url:'http://feed1', FeedItems: saveFeedItems1}, {url:'http://feed2', FeedItems: saveFeedItems2}]);
        done();
      }).catch(done);
    });
    it('should be able to read a specific saved feed item', function (done) {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      var startDate = new Date();
      var endDate;
      return persistence.saveFeed('http://feed1', saveFeedItems1).then(function(){
        return persistence.saveFeed('http://feed2', saveFeedItems2);
      }).then(function() {
        endDate = new Date();
        return persistence.getFeedItems();
      }).then(function(feedItems){
        var findId = feedItems.find(function(feedItem){
          return feedItem.url === saveFeedItems1[0].url;
        }).id;
        return persistence.findFeedItem(findId);
      }).then(function(feedItem) {
        var endDate = new Date();
        feedItem = feedItem.toJSON();
        assert.equal(feedItem.createdAt >= startDate, true);
        assert.equal(feedItem.updatedAt >= startDate, true);
        assert.equal(feedItem.createdAt <= endDate, true);
        assert.equal(feedItem.updatedAt <= endDate, true);
        delete feedItem.createdAt;
        delete feedItem.updatedAt;
        delete feedItem.id;
        assert.deepEqual(feedItem, saveFeedItems1[0]);
        done();
      }).catch(done);
    });
    it('should not be able to read a non-existing feed item', function (done) {
      var saveFeedItems1 = [
        {guid: 'Guid-01', title: 'Title 1', date: new Date('2014-01-01T12:34:56'), contents: 'Contents 1', url: 'http://feed1/item1'},
        {guid: 'Guid-02', title: 'Title 2', date: new Date('2014-01-02T12:34:56'), contents: 'Contents 2', url: 'http://feed1/item2'}
      ];
      var saveFeedItems2 = [
        {guid: 'Guid-03', title: 'Title 3', date: new Date('2014-01-03T12:34:56'), contents: 'Contents 3', url: 'http://feed2/item1'},
        {guid: 'Guid-04', title: 'Title 4', date: new Date('2014-01-04T12:34:56'), contents: 'Contents 4', url: 'http://feed2/item2'}
      ];
      return persistence.saveFeed('http://feed1', saveFeedItems1).then(function(){
        return persistence.saveFeed('http://feed2', saveFeedItems2);
      }).then(function() {
        return persistence.getFeedItems();
      }).then(function(feedItems){
        var maxId = Math.max.apply(null, feedItems.map(function(feedItem) {
          return feedItem.id
        }));
        return persistence.findFeedItem(maxId + 1);
      }).then(function(feedItem) {
        assert.equal(feedItem, null);
        done();
      }).catch(done);
    });
  });
});
