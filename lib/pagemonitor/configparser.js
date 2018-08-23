var parseString = require('xml2js').parseString;

var parsePageMonitorXML = function(configurationString){
  return new Promise(function(resolve, reject) {
    if(configurationString === null || configurationString === undefined)
      return reject(new Error("Configuration is undefined"));
    parseString(configurationString, function(err, result){
      if (err)
        return reject(err);
      if(result.pages === undefined || result.pages.page === undefined)
        //TODO: complain if format is unsupported?
        resolve([]);
      var decodedPages = result.pages.page.map(function(page){
        var decodedPage = page.$;
        decodedPage.title = page._;
        return decodedPage;
      });
      resolve(decodedPages);
    });
  });
};

module.exports.parsePageMonitorXML = parsePageMonitorXML;
