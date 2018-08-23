var dbConfiguration = require('./dbconfiguration');
var persistence = require('../../lib/services/persistence');
var logger = require('../../lib/services/logger').logger;
var superagent = require('superagent');
require('./logging');

var app = require('../../app');
var http = require('http');

var port = 3000;
var baseUrl = "http://localhost:" + port;

var authenticateUser = function(userData, callback){
  superagent.post(baseUrl + "/oauth/token")
    .send("username=" + userData.username)
    .send("password=" + userData.password)
    .send("grant_type=password")
    .end(function(err, result){
      if(err) return callback(err);
      callback(null, result.body.access_token, result);
    });
};

var tokenHeader = function(token){
  return {Authorization: "Bearer " + token};
};

var hooks = function(){
  var server;
  var jsDate;
  before(function(done){
    app.set('port', port);
    server = http.createServer(app);
    server.listen(port, null, null, done);
  });

  after(function(done) {
    server.close(done);
  });

  beforeEach(function() {
    jsDate = Date;
    logger.info(this.currentTest.fullTitle());
    dbConfiguration.reconfigureDb();
    return persistence.init({force: true});
  });

  afterEach(function() {
    Date = jsDate;
    return persistence.close();
  });
}

module.exports.baseUrl = baseUrl;
module.exports.hooks = hooks;
module.exports.authenticateUser = authenticateUser;
module.exports.tokenHeader = tokenHeader;
