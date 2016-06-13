var Sequelize = require('sequelize');
var persistenceconfiguration = require('./persistenceconfiguration');

/**
 * Helper functons
 */
var sequelizeConfigurer = function(){
   return new Sequelize(persistenceconfiguration.uri, persistenceconfiguration.options);
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
  timestamps: true
});

var PageMonitorItem = sequelize.define('PageMonitorItem', {
  url: Sequelize.STRING,
  contents: Sequelize.TEXT,
  delta: Sequelize.TEXT
}, {
  timestamps: true
});

var FeedItem = sequelize.define('FeedItem', {
  guid: Sequelize.STRING,
  title: Sequelize.TEXT,
  date: Sequelize.DATE,
  contents: Sequelize.TEXT,
  url: Sequelize.TEXT
}, {
  timestamps: true
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
  //TODO: this is not transacted and so is not safe from race conditions
  return User.findOne({where: {username: 'default'}}).then(function(user){
    if(user === null)
      return User.create({username: 'default'});
    return user;
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
        //Force Sequelize update of updatedAt
        savedItem.changed('guid', true);
        return savedItem.setFeed(feed);
      });
    }));
  });
};

var getPageMonitorItems = function(){
  //TODO: check username associations
  return PageMonitorItem.findAll();
};

var findPageMonitorItem = function(id, findAttribute){
  if(findAttribute !== 'id' && findAttribute !== 'url')
    findAttribute = 'id';
  return PageMonitorItem.find({where: {[findAttribute]: id}});
};

var getFeedItems = function(){
  //TODO: check username associations
  return FeedItem.findAll({include: Feed});
};

var getFeeds = function(){
  //TODO: check username associations
  return Feed.findAll({include: FeedItem});
};

var findFeedItem = function(id){
  //TODO: check username associations
  return FeedItem.findOne({where: {id: id}});
};

module.exports.init = init;
module.exports.getUserData = getUserData;
module.exports.savePageMonitorItem = savePageMonitorItem;
module.exports.saveFeed = saveFeed;
module.exports.findPageMonitorItem = findPageMonitorItem;
module.exports.getPageMonitorItems = getPageMonitorItems;
module.exports.findFeedItem = findFeedItem;
module.exports.getFeedItems = getFeedItems;
module.exports.getFeeds = getFeeds;
