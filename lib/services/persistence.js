var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');
var i18n = require('i18n');
var logger = require('./logger').logger;

/**
 * Helper functons
 */
var sequelizeConfigurer = function(){
 if(process.env.DATABASE_URL !== undefined)
   return new Sequelize(process.env.DATABASE_URL, {isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.verbose});
 else
   return new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "nanoRSS.sqlite"), isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.verbose});
};

var sequelize = sequelizeConfigurer();

var normalizeUsername = function(username){
  return username !== undefined ? username.toLowerCase().trim() : undefined;
};

/**
 * Model
 */
var User = sequelize.define('User', {
  username: {
    type: Sequelize.STRING,
    unique: true,
    get: function(){
      return normalizeUsername(this.getDataValue('username'));
    },
    set: function(value){
      this.setDataValue('username', normalizeUsername(value));
    },
    validate: { notEmpty: true }
  },
  password: {
    type: Sequelize.TEXT,
    validate: { notEmpty: true }
  },
  opml: {
    type: Sequelize.TEXT
  },
  pagemonitor: {
    type: Sequelize.TEXT
  }
}, {
  timestamps: false
});

var Feed = sequelize.define('Feed', {
  url: {
    type: Sequelize.STRING,
    primaryKey: true
  }
}, {
  timestamps: false
});

var PageMonitorItem = sequelize.define('PageMonitorItem', {
  url: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  updated: Sequelize.DATE,
  contents: Sequelize.TEXT,
  delta: Sequelize.TEXT
}, {
  timestamps: false
});

var FeedItem = sequelize.define('FeedItem', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  },
}, {
  timestamps: false
});

/**
 * Exports
 */
var init = function(options) {
  return sequelize.sync(options);
};

var getUserData = function(){
  //TODO: check username
  return User.findOrCreate({where: {username: 'default'}}).then(function(user){
    return user[0];
  });
};

var getUserPageMonitorConfiguration = function(){
  //TODO: check username
  return getUserData().then(function(user){

  });
}

var savePageMonitorItem = function(data){
  //TODO: check username associations
  return PageMonitorItem.findOne({where: {url: data.url}}).then(function(savedPage) {
    if(savedPage === null)
      return PageMonitorItem.create(data);
    return savedPage.update(data);
  });
};

var getPageMonitorItems = function(){
  //TODO: check username associations
  return PageMonitorItem.findAll();
};

var findPageMonitorItem = function(url){
  return PageMonitorItem.find({where: {url: url}});
};

module.exports.init = init;
module.exports.getUserData = getUserData;
module.exports.savePageMonitorItem = savePageMonitorItem;
module.exports.findPageMonitorItem = findPageMonitorItem;
module.exports.getPageMonitorItems = getPageMonitorItems;
