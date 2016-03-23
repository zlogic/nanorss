var parseString = require('xml2js').parseString;
var i18n = require('i18n');

var parseConfig = function(configurationString, cb){
  if(configurationString === null || configurationString === undefined)
    return cb(new Error(i18n.__("Configuration is undefined")));
  return parseString(configurationString, function(err, result){
    if (err)
      return cb(err);
    cb(null, result);
  });
};

module.exports.parseConfig = parseConfig;
