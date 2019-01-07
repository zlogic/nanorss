var serviceBase = require('./utils/servicebase')
var createLoadFile = require('./utils/loadfile');
var assert = require('assert');
var persistence = require('../lib/services/persistence');
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;
var loadFile = createLoadFile('item');

var prepopulate = async function() {
  var user = await persistence.getUserData();
  user.opml = "<opml/>";
  user.pagemonitor = "<pagemonitor/>";
  user.username = "default"
  user.password = "pass";
  user.pagemonitor = await loadFile('pagemonitor.xml');
  user.opml = await loadFile('opml.xml');
  return user.save();
};

describe('Items', function() {
  serviceBase.hooks();
  
  describe('pagemonitor', function () {
    it('should be able to get an existing pagemonitor item', async function () {
      var user = await prepopulate();
      var pageMonitorItems = await user.getPageMonitorItems();
      await Promise.all([
        pageMonitorItems[0].update({delta: "Item 1\nnewline"}),
        pageMonitorItems[1].update({delta: "Item 2"})
      ]);

      var result = await superagent.get(baseUrl + "/pagemonitor/1");
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.text, "Item 1<br>\nnewline");

      result = await superagent.get(baseUrl + "/pagemonitor/2");
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.text, "Item 2");
    });
    it('should not be able to get a non-existing pagemonitor item', async function () {
      var user = await prepopulate();

      var error;
      var result;
      try {
        await superagent.get(baseUrl + "/pagemonitor/3");
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(error.status, 404);
      assert.ok(result.text.includes("Item not found"));
    });
  });
  
  describe('feed', function () {
    it('should be able to get an existing feed item', async function () {
      var user = await prepopulate();
      await persistence.saveFeed('http://sites-site1.com', [{contents: 'Contents 1', date: new Date('2014-01-01T12:34:56')}, {contents: 'Contents 2', date: new Date('2014-01-01T12:34:57')}]);
      await persistence.saveFeed('http://updates-site2.com', [{contents: 'Contents 3'}, {contents: 'Contents 4'}]);

      var result = await superagent.get(baseUrl + "/feeditem/1");
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.text, "Contents 1");

      result = await superagent.get(baseUrl + "/feeditem/2");
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.text, "Contents 2");
    });
    it('should not be able to get a non-existing feed item', async function () {
      var user = await prepopulate();

      var error;
      var result;
      try {
        await superagent.get(baseUrl + "/feeditem/1");
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(error.status, 404);
      assert.ok(result.text.includes("Item not found"));
    });
  });
  
  describe('userfeed', function () {
    it('should be able to get the list of feed items for an authenticated user', async function () {
      var userData = {username: "default", password: "pass"};
      var user = await prepopulate();
      var pageMonitorItems = await user.getPageMonitorItems();
        
      var jsDate = Date;
      var fakeDate;
      Date = function (fake) {return fakeDate;};
      fakeDate = new jsDate('2014-01-01T12:34:56');
      await pageMonitorItems[0].update({delta: "Item 1"});
      fakeDate = new jsDate('2015-01-01T12:34:56')
      await pageMonitorItems[1].update({delta: "Item 2"})
      Date = jsDate;

      await persistence.saveFeed('http://sites-site1.com', [
        {title:'Title 1', url:'http://i1', date: new Date('2013-02-01T12:34:56')},
        {title:'Title 2', url:'http://i2', date: new Date()}
      ])
      await persistence.saveFeed('http://updates-site2.com', [
        {title:'Title 3', url:'http://i3', date: new Date('2014-02-01T12:34:56')},
        {title:'Title 4', url:'http://i4', date: new Date('2016-01-01T12:34:56')}
      ]);

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/user/feed").set(tokenHeader(token));

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
    });
    it('should be not able to get the list of feed items for an unauthenticated user (no token)', async function () {
      var user = await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/user/feed");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should be not able to get the list of feed items for an unauthenticated user (bad token)', async function () {
      var user = await prepopulate();
      var token = 'aaaa';

      var error;
      try {
        await superagent.get(baseUrl + "/user/feed").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
  });
});
