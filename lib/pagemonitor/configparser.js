var xml2js = require('xml2js');
var util = require('util');

var parseXmlString = util.promisify(xml2js.parseString);

var parsePageMonitorXML = async function(configurationString){
  if(configurationString === null || configurationString === undefined)
    throw new Error("Configuration is undefined");
   var parseResult = await parseXmlString(configurationString);
  if(parseResult.pages === undefined || parseResult.pages.page === undefined)
    //TODO: complain if format is unsupported?
    return [];
  return parseResult.pages.page.map(function(page){
    var decodedPage = page.$;
    decodedPage.title = page._;
    return decodedPage;
  });
};

module.exports.parsePageMonitorXML = parsePageMonitorXML;
