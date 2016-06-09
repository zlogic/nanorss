var fs = require('fs');
var assert = require('assert');

var feedConfiguration = require('../lib/feed/configuration');
var pagemonitorConfiguration = require('../lib/pagemonitor/configuration');

describe('Configuration reader', function() {
  describe('pagemonitor', function() {
    it('should be able to parse a pagemonitor configuration', function (done) {
      return fs.readFile("./test/data/configuration/pagemonitor.xml", function(error, data){
        if(error) return done(error);
        pagemonitorConfiguration.parseConfig(data, function(error, data) {
          if(error) return done(error);
          assert.deepEqual(data, {
            pages: {
              page: [
                { $: { flags: "mi", match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*", replace: "$1", url: "https://site1.com" }, _: "Site 1" },
                { $: { url: "http://site2.com" }, _: "Site 2" }
              ]
            }
          });
          return done();
        });
      });
    });
    it('should fail when parsing a bad pagemonitor configuration', function (done) {
      return fs.readFile("./test/data/configuration/pagemonitor_broken.xml", function(error, data){
        if(error) return done(error);
        pagemonitorConfiguration.parseConfig(data, function(error, data) {
          assert.equal(undefined, data);
          if(error) return done();
          done(new Error("Error is not assigned"))
        });
      });
    });
  });
  describe('feed', function() {
    it('should be able to get a list of URLs from an OPML configuration', function (done) {
      return fs.readFile("./test/data/configuration/opml.xml", function(error, data){
        if(error) return done(error);
        feedConfiguration.parseGetUrls(data, function(error, data) {
          if(error) return done(error);
          assert.deepEqual(data, ['http://sites-site1.com', 'http://updates-site2.com','http://updates-site3.com']);
          return done();
        });
      });
    });
    it('should fail when parsing a bad pagemonitor configuration to get a list of URLs', function (done) {
      return fs.readFile("./test/data/configuration/opml_broken.xml", function(error, data){
        if(error) return done(error);
        feedConfiguration.parseGetUrls(data, function(error, data) {
          assert.equal(undefined, data);
          if(error) return done();
          done(new Error("Error is not assigned"))
        });
      });
    });
    it('should be able to get a list of URLs with associated names from an OPML configuration', function (done) {
      return fs.readFile("./test/data/configuration/opml.xml", function(error, data){
        if(error) return done(error);
        feedConfiguration.parseGetUrlNames(data, function(error, data) {
          if(error) return done(error);
          assert.deepEqual(data, { 'http://sites-site1.com': 'Site 1', 'http://updates-site2.com': 'Site 2', 'http://updates-site3.com': 'Site 3' });
          return done();
        });
      });
    });
    it('should fail when parsing a bad pagemonitor configuration to get a list of URLs with associated names', function (done) {
      return fs.readFile("./test/data/configuration/opml_broken.xml", function(error, data){
        if(error) return done(error);
        feedConfiguration.parseGetUrls(data, function(error, data) {
          assert.equal(undefined, data);
          if(error) return done();
          done(new Error("Error is not assigned"))
        });
      });
    });
  });
});
