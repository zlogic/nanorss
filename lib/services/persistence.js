var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');
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
  guid: Sequelize.STRING,
  title: Sequelize.TEXT,
  date: Sequelize.DATE,
  contents: Sequelize.TEXT,
  url: Sequelize.TEXT
}, {
  timestamps: false
});


/**
 * Associations
 */
FeedItem.belongsTo(Feed);
Feed.hasMany(FeedItem, {onDelete: 'cascade'});

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

var savePageMonitorItem = function(data){
  //TODO: check username associations
  return PageMonitorItem.findOne({where: {url: data.url}}).then(function(savedPage) {
    if(savedPage === null)
      return PageMonitorItem.create(data);
    return savedPage.update(data);
  });
};

var saveFeed = function(url, items){
  return Feed.findOne({where: {url: url}}).then(function(feed) {
    if(feed === null)
      return Feed.create({url: url});
    return feed;
  }).then(function(feed){
    return Promise.all(items.map(function(item){
      item.FeedUrl = url;
      return FeedItem.findOne({where: {guid: item.guid}}).then(function(savedItem){
        if(savedItem === null)
          return FeedItem.create(item);
        return savedItem.update(item);
      }).then(function(savedItem){
        return savedItem.setFeed(feed);
      });
    }));
  });
};

var getPageMonitorItems = function(){
  //TODO: check username associations
  return PageMonitorItem.findAll();
};

var findPageMonitorItem = function(url){
  return PageMonitorItem.find({where: {url: url}});
};

var getFeedItems = function(){
  //TODO: check username associations
  return FeedItem.findAll();
};

module.exports.init = init;
module.exports.getUserData = getUserData;
module.exports.savePageMonitorItem = savePageMonitorItem;
module.exports.saveFeed = saveFeed;
module.exports.findPageMonitorItem = findPageMonitorItem;
module.exports.getPageMonitorItems = getPageMonitorItems;
module.exports.getFeedItems = getFeedItems;