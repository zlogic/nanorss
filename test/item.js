var serviceBase = require('./utils/servicebase')
var createLoadFile = require('./utils/loadfile');
var assert = require('assert');
var persistence = require('../lib/services/persistence');
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
  
  describe('pagemonitor', function () {
    it('should be able to get an existing pagemonitor item', function (done) {
      prepopulate().then(function(user) {
        return user.getPageMonitorItems();
      }).then(function(pageMonitorItems){
        return Promise.all([
          pageMonitorItems[0].update({delta: "Item 1\nnewline"}),
          pageMonitorItems[1].update({delta: "Item 2"})
        ]);
      }).then(function(){
        superagent.get(baseUrl + "/pagemonitor/1").end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Item 1<br>\nnewline");
          } catch(err) {done(err);}
        });
      }).then(function(){
        superagent.get(baseUrl + "/pagemonitor/2").end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Item 2");
            done();
          } catch(err) {done(err);}
        });
      });
    });
    it('should not be able to get a non-existing pagemonitor item', function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/pagemonitor/3").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 404);
            assert.ok(result.text.includes("Item not found"));
            done();
          } catch(err) {done(err);}
        });
      });
    });
  });
  
  describe('feed', function () {
    it('should be able to get an existing feed item', function (done) {
      prepopulate().then(function(user) {
        return Promise.all([
          persistence.saveFeed('http://sites-site1.com', [{contents: 'Contents 1', date: new Date('2014-01-01T12:34:56')}, {contents: 'Contents 2', date: new Date('2014-01-01T12:34:57')}]),
          persistence.saveFeed('http://updates-site2.com', [{contents: 'Contents 3'}, {contents: 'Contents 4'}])
        ]);
      }).then(function(){
        superagent.get(baseUrl + "/feeditem/1").end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Contents 1");
          } catch(err) {done(err);}
        });
      }).then(function(){
        superagent.get(baseUrl + "/feeditem/2").end(function(err, result){
          try {
            assert.ok(result);
            assert.equal(result.status, 200);
            assert.equal(result.text, "Contents 2");
            done();
          } catch(err) {done(err);}
        });
      });
    });
    it('should not be able to get a non-existing feed item', function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/feeditem/1").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 404);
            assert.ok(result.text.includes("Item not found"));
            done();
          } catch(err) {done(err);}
        });
      });
    });
  });
  
  describe('userfeed', function () {
    it('should be able to get the list of feed items for an authenticated user', function (done) {
      var userData = {username: "default", password: "pass"};
      prepopulate().then(function(user) {
        return user.getPageMonitorItems();
        
      }).then(function(pageMonitorItems){
        var jsDate = Date;
        var fakeDate;
        Date = function (fake) {return fakeDate;};
        fakeDate = new jsDate('2014-01-01T12:34:56');
        return pageMonitorItems[0].update({delta: "Item 1"}).then(function() {
          fakeDate = new jsDate('2015-01-01T12:34:56')
          return pageMonitorItems[1].update({delta: "Item 2"})
        }).then(function(){
          Date = jsDate;
        });
      }).then(function() {
        return persistence.saveFeed('http://sites-site1.com', [
          {title:'Title 1', url:'http://i1', date: new Date('2013-02-01T12:34:56')},
          {title:'Title 2', url:'http://i2', date: new Date()}
        ]).then(function() {
          return persistence.saveFeed('http://updates-site2.com', [
            {title:'Title 3', url:'http://i3', date: new Date('2014-02-01T12:34:56')},
            {title:'Title 4', url:'http://i4', date: new Date('2016-01-01T12:34:56')}
          ]);
        });
      }).then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/user/feed").set(tokenHeader(token)).end(function(err, result){
            try {
              var expectedFeed = [
                {title:"Title 2",origin:"Site 1",fetchUrl:"feeditem/2",url:"http://i2"},
                {title:"Title 4",origin:"Site 2",fetchUrl:"feeditem/4",url:"http://i4"},
                {title:"Page 2",origin:"Page 2",fetchUrl:"pagemonitor/2",url:"http://site2.com"},
                {title:"Title 3",origin:"Site 2",fetchUrl:"feeditem/3",url:"http://i3"},
                {title:"Page 1",origin:"Page 1",fetchUrl:"pagemonitor/1",url:"https://site1.com"},
                {title:"Title 1",origin:"Site 1",fetchUrl:"feeditem/1",url:"http://i1"},
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
      });
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
      });
    });
  });
});
