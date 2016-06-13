var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');
var logger = require('./logger').logger;

var uri = process.env.DATABASE_URL !== undefined ? process.env.DATABASE_URL : "sqlite:";
var options = {logging: logger.verbose};

if(uri === "sqlite:")
  options.storage= path.resolve(os.tmpdir(), "nanoRSS.sqlite");

module.exports.uri = uri;
module.exports.options = options;
