var parseString = require('xml2js').parseString;

var parseOPML = function(opmlString){
  return new Promise(function(resolve, reject) {
    if(opmlString === null || opmlString === undefined)
      return reject(new Error("Configuration is undefined"));
    return parseString(opmlString, function(err, result){
      if(err)
        return reject(err);
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
        resolve(urls);
      } catch(err) {
        reject(err);
      }
    });
  });
};

module.exports.parseOPML = parseOPML;
