var fs = require('fs');
var path = require('path');
var assert = require('assert');
var util = require('util');

var feedConfigparser = require('../lib/feed/configparser');
var pagemonitorConfigparser = require('../lib/pagemonitor/configparser');

var readFile = util.promisify(fs.readFile);

describe('Configuration reader', function() {
  describe('pagemonitor', async function() {
    it('should be able to parse a pagemonitor configuration', async function () {
      var data = await readFile(path.join(__dirname, 'data', 'configuration', 'pagemonitor.xml'));
      data = await pagemonitorConfigparser.parsePageMonitorXML(data);
      assert.deepEqual(data, [
        { flags: "mi", match: "[\\S\\s]*Begin([\\S\\s]*)End[\\S\\s]*", replace: "$1", url: "https://site1.com", title: "Site 1" },
        { url: "http://site2.com", title: "Site 2" }
      ]);
    });
    it('should fail when parsing a bad pagemonitor configuration', async function () {
      var data = await readFile(path.join(__dirname, 'data', 'configuration', 'pagemonitor_broken.xml'));
      try {
        await pagemonitorConfigparser.parsePageMonitorXML(data);
      } catch(error) {
        return;
      };
      throw new Error("Error is not thrown");
    });
  });
  describe('feed', function() {
    it('should be able to get a list of URLs with associated names from an OPML configuration', async function () {
      var data = await readFile(path.join(__dirname, 'data', 'configuration', 'opml.xml'));
      data = await feedConfigparser.parseOPML(data);
      assert.deepEqual(data, { 'http://sites-site1.com': 'Site 1', 'http://updates-site2.com': 'Site 2', 'http://updates-site3.com': 'Site 3' });
    });
    it('should fail when parsing a bad pagemonitor configuration to get a list of URLs with associated names', async function () {
      var data = await readFile(path.join(__dirname, 'data', 'configuration', 'opml_broken.xml'));
      try {
        await feedConfigparser.parseOPML(data);
      } catch(error) {
        return;
      }
      throw new Error("Error is not thrown");
    });
  });
});
