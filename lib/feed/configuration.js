var parseString = require('xml2js').parseString;
var logException = require('../services/logger').logException;

var configXml = function(configurationString, documentHandler){
  return parseString(configurationString, function(err, result){
    if (err) {
      logException(err);
      return documentHandler(err);
    }
    return documentHandler(null, result);
  });
};

var configXmlUrls = function(configurationString, urlsHandler){
  return configXml(configurationString, function(err, result){
    if(err)
      return urlsHandler(err);
    try {
      var urls = [];
      var handleOutlines = function(outlines){
        if(outlines !== undefined)
          outlines.forEach(function(outline){
            if(outline.$ !== undefined && outline.$.type === 'rss' && outline.$.xmlUrl !== undefined)
              urls.push(outline.$.xmlUrl);
            handleOutlines(outline.outline);
          });
      }
      handleOutlines(result.opml.body);
      urlsHandler(null, urls);
    } catch(err) {
      return urlsHandler(err);
    }
  });
};

module.exports.configXml = configXml;
module.exports.configXmlUrls = configXmlUrls;
