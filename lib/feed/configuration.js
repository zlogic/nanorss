var parseString = require('xml2js').parseString;
var i18n = require('i18n');

var parseConfig = function(opmlString, cb){
  if(opmlString === null || opmlString === undefined)
    return cb(new Error(i18n.__("Configuration is undefined")));
  return parseString(opmlString, function(err, result){
    if (err)
      return cb(err);
    return cb(null, result);
  });
};

var parseGetUrlNames = function(opmlString, cb){
  return parseConfig(opmlString, function(err, result){
    if(err)
      return cb(err);
    try {
      var urls = {};
      var handleOutlines = function(outlines){
        if(outlines !== undefined)
          outlines.forEach(function(outline){
            if(outline.$ !== undefined && outline.$.type === 'rss' && outline.$.xmlUrl !== undefined)
              urls[outline.$.xmlUrl] = outline.$.title;
            handleOutlines(outline.outline);
          });
      };
      handleOutlines(result.opml.body);
      cb(null, urls);
    } catch(err) {
      return cb(err);
    }
  });
};

var parseGetUrls = function(opmlString, cb){
  return parseGetUrlNames(opmlString, function(err, result){
    if(err)
      return cb(err);
    return cb(null, Object.keys(result));
  });
};

module.exports.parseConfig = parseConfig;
module.exports.parseGetUrls = parseGetUrls;
module.exports.parseGetUrlNames = parseGetUrlNames;
