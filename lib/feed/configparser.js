var xml2js = require('xml2js');
var util = require('util');

var parseXmlString = util.promisify(xml2js.parseString);

var parseOPML = async function(opmlString){
  if(opmlString === null || opmlString === undefined)
    throw new Error("Configuration is undefined");
  var parseResult = await parseXmlString(opmlString);
  var urls = {};
  var handleOutlines = function(outlines){
    if(outlines !== undefined)
      outlines.forEach(function(outline){
        if(outline.$ !== undefined && outline.$.type === 'rss' && outline.$.xmlUrl !== undefined)
          urls[outline.$.xmlUrl] = outline.$.title;
        handleOutlines(outline.outline);
      });
  };
  handleOutlines(parseResult.opml.body);
  return urls;
};

module.exports.parseOPML = parseOPML;
