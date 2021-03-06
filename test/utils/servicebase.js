var dbConfiguration = require('./dbconfiguration');
var persistence = require('../../lib/services/persistence');
var logger = require('../../lib/services/logger').logger;
var superagent = require('superagent');
var util = require('util');
require('./logging');

var app = require('../../app');
var http = require('http');

var port = 3000;
var baseUrl = "http://localhost:" + port;

var authenticateUser = async function(userData){
  var result = await superagent.post(baseUrl + "/oauth/token")
    .send("username=" + userData.username)
    .send("password=" + userData.password)
    .send("grant_type=password");
  return {token: result.body.access_token, result: result};
};

var sleep = util.promisify(setTimeout);

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
module.exports.sleep = sleep;
module.exports.tokenHeader = tokenHeader;
