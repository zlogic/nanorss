var fs = require('fs');
var path = require('path');
var assert = require('assert');

var feedConfigparser = require('../lib/feed/configparser');
var pagemonitorConfigparser = require('../lib/pagemonitor/configparser');

describe('Configuration reader', function() {
  describe('pagemonitor', function() {
    it('should be able to parse a pagemonitor configuration', function (done) {
      return fs.readFile("./test/data/configuration/pagemonitor.xml", function(error, data){
        if(error) return done(error);
        pagemonitorConfigparser.parsePageMonitorXML(data).then(function(data) {
          assert.deepEqual(data, [
            { flags: "mi", match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*", replace: "$1", url: "https://site1.com", title: "Site 1" },
            { url: "http://site2.com", title: "Site 2" }
          ]);
          done();
        }).catch(done);
      });
    });
    it('should fail when parsing a bad pagemonitor configuration', function (done) {
      return fs.readFile(path.join(__dirname, 'data', 'configuration', 'pagemonitor_broken.xml'), function(error, data){
        if(error) return done(error);
        pagemonitorConfigparser.parsePageMonitorXML(data).then(function(data) {
          assert.equal(undefined, data);
          done(new Error("Error is not assigned"));
        }).catch(function(error) {
          return done();
        });
      });
    });
  });
  describe('feed', function() {
    it('should be able to get a list of URLs with associated names from an OPML configuration', function (done) {
      return fs.readFile(path.join(__dirname, 'data', 'configuration', 'opml.xml'), function(error, data){
        if(error) return done(error);
        feedConfigparser.parseOPML(data).then(function(data) {
          assert.deepEqual(data, { 'http://sites-site1.com': 'Site 1', 'http://updates-site2.com': 'Site 2', 'http://updates-site3.com': 'Site 3' });
          done();
        }).catch(done);
      });
    });
    it('should fail when parsing a bad pagemonitor configuration to get a list of URLs with associated names', function (done) {
      return fs.readFile(path.join(__dirname, 'data', 'configuration', 'opml_broken.xml'), function(error, data){
        if(error) return done(error);
        feedConfigparser.parseOPML(data).then(function(data) {
          assert.equal(undefined, data);
          done(new Error("Error is not assigned"));
        }).catch(function() {
          done();
        });
      });
    });
  });
});
