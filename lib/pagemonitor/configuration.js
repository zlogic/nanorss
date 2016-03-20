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

module.exports.configXml = configXml;
