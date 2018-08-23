var fs = require('fs');
var path = require('path');

var createLoadFile = function(dir){
  return function(filename) {
    return new Promise(function(resolve, reject){
      fs.readFile(path.join(__dirname, '..', 'data', dir, filename), function(error, data){
        if(error) return reject(error);
        resolve(data);
      });
    });
  };
};

module.exports = createLoadFile;