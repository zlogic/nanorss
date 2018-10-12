var fs = require('fs');
var path = require('path');
var util = require('util');

var readFile = util.promisify(fs.readFile);
var createLoadFile = function(dir){
  return async function(filename) {
    return readFile(path.join(__dirname, '..', 'data', dir, filename));
  };
};

module.exports = createLoadFile;