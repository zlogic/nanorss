var parseString = require('xml2js').parseString;
var i18n = require('i18n');
var logException = require('../services/logger').logException;

var configXml = function(configurationString, documentHandler){
  if(configurationString === null || configurationString === undefined)
    return documentHandler(new Error(i18n.__("Configuration is undefined")));
  return parseString(configurationString, function(err, result){
    if (err) {
      logException(err);
      return documentHandler(err);
    }
    return documentHandler(null, result);
  });
};

module.exports.configXml = configXml;
