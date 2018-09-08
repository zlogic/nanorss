var serviceBase = require('./utils/servicebase')
var createLoadFile = require('./utils/loadfile');
var assert = require('assert');
var persistence = require('../lib/services/persistence');
var persistencebase = require('./utils/persistencebase');
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;
var loadFile = createLoadFile('item');

var prepopulate = function() {
  return persistence.getUserData().then(function(user){
    user.opml = "<opml/>";
    user.pagemonitor = "<pagemonitor/>";
    user.username = "default"
    user.password = "pass";
    return loadFile('pagemonitor.xml').then(function(pagemonitor) {
      user.pagemonitor = pagemonitor;
      return loadFile('opml.xml');
    }).then(function(opml) {
      user.opml = opml;
      return user.save();
    });
  })
};

describe('Items', function() {
  serviceBase.hooks();

  persistencebase.hooks();
  
  describe('pagemonitor', function () {
    it('should be able to get an existing pagemonitor item', function (done) {
      var item1Id, item2Id;
      prepopulate().then(function() {
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems){
        item1Id = pageMonitorItems[0]._id;
        item2Id = pageMonitorItems[1]._id;
        pageMonitorItems[0].set({delta: "Item 1\nnewline"}),
        pageMonitorItems[1].set({delta: "Item 2"})
        return Promise.all(pageMonitorItems.map(persistence.savePageMonitorItem));
      }).then(function(){
        superagent.get(baseUrl + "/pagemonitor/" + item1Id).end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Item 1<br>\nnewline");
          } catch(err) {done(err);}
        });
      }).then(function(){
        superagent.get(baseUrl + "/pagemonitor/" + item2Id).end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Item 2");
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a non-existing pagemonitor item', function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/pagemonitor/000000000000000000000000").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 404);
            assert.ok(result.text.includes("Item not found"));
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
  
  describe('feed', function () {
    it('should be able to get an existing feed item', function (done) {
      var item1Id, item2Id;
      prepopulate().then(function(user) {
        return Promise.all([
          persistence.saveFeed('http://sites-site1.com', [{contents: 'Contents 1', date: new Date('2014-01-01T12:34:56'), guid: '01'}, {contents: 'Contents 2', date: new Date('2014-01-01T12:34:57'), guid: '02'}]),
          persistence.saveFeed('http://updates-site2.com', [{contents: 'Contents 3', guid: '01'}, {contents: 'Contents 4', guid: '02'}])
        ]);
      }).then(function(feeds){
        item1Id = feeds[0].items[0]._id;
        item2Id = feeds[0].items[1]._id;
        superagent.get(baseUrl + "/feeditem/" + item1Id).end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Contents 1");
          } catch(err) {done(err);}
        });
      }).then(function(){
        superagent.get(baseUrl + "/feeditem/" + item2Id).end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Contents 2");
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a non-existing feed item', function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/feeditem/000000000000000000000000").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 404);
            assert.ok(result.text.includes("Item not found"));
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
  
  describe('userfeed', function () {
    it('should be able to get the list of feed items for an authenticated user', function (done) {
      var userData = {username: "default", password: "pass"};
      var pageMonitorItem1Id, pageMonitorItem2Id;
      var feedItem1Id, feedItem2Id, feedItem3Id, feedItem4Id;
      prepopulate().then(function(user) {
        return persistence.getPageMonitorItems();
      }).then(function(pageMonitorItems){
        pageMonitorItem1Id = pageMonitorItems[0]._id;
        pageMonitorItem2Id = pageMonitorItems[1]._id;
        pageMonitorItems[0].delta = "Item 1";
        pageMonitorItems[1].delta = "Item 2";        
        return Promise.all(pageMonitorItems.map(persistence.savePageMonitorItem));
      }).then(function() {
        return persistence.saveFeed('http://sites-site1.com', [
          {title:'Title 1', url:'http://i1', date: new Date('2013-02-01T12:34:56'), guid: '01'},
          {title:'Title 2', url:'http://i2', date: new Date(), guid: '02'}
        ]).then(function(savedFeed1) {
          feedItem1Id = savedFeed1.items[0]._id;
          feedItem2Id = savedFeed1.items[1]._id;
          return persistence.saveFeed('http://updates-site2.com', [
            {title:'Title 3', url:'http://i3', date: new Date('2014-02-01T12:34:56'), guid: '01'},
            {title:'Title 4', url:'http://i4', date: new Date('2016-01-01T12:34:56'), guid: '02'}
          ]);
        }).then(function(savedFeed2){
          feedItem3Id = savedFeed2.items[0]._id;
          feedItem4Id = savedFeed2.items[1]._id;
        });
      }).then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/user/feed").set(tokenHeader(token)).end(function(err, result){
            try {
              var expectedFeed = [
                {title:"Title 2",origin:"Site 1",fetchUrl:"feeditem/"+feedItem2Id,url:"http://i2"},
                {title:"Page 1",origin:"Page 1",fetchUrl:"pagemonitor/"+pageMonitorItem1Id,url:"https://site1.com"},
                {title:"Page 2",origin:"Page 2",fetchUrl:"pagemonitor/"+pageMonitorItem2Id,url:"http://site2.com"},
                {title:"Title 4",origin:"Site 2",fetchUrl:"feeditem/"+feedItem4Id,url:"http://i4"},
                {title:"Title 3",origin:"Site 2",fetchUrl:"feeditem/"+feedItem3Id,url:"http://i3"},
                {title:"Title 1",origin:"Site 1",fetchUrl:"feeditem/"+feedItem1Id,url:"http://i1"},
              ];
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body,expectedFeed);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be not able to get the list of feed items for an unauthenticated user (no token)', function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/user/feed").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should be not able to get the list of feed items for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/user/feed").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
