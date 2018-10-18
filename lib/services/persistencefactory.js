var Sequelize = require('sequelize');
var crypto = require('crypto');
var util = require('util');
var pagemonitorConfigparser = require('../pagemonitor/configparser');
var feedConfigparser = require('../feed/configparser');
var os = require('os');
var logger = require('./logger');
var path = require('path');

var sequelizeConfigurer = function(databaseUrl, sequelizeOptions){
  var sequelize;

  if(databaseUrl && sequelizeOptions)
    sequelize = new Sequelize(databaseUrl, sequelizeOptions);
  else if(process.env.DATABASE_URL !== undefined)
    sequelize = new Sequelize(process.env.DATABASE_URL, {isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger, operatorsAliases: false});
  else
    sequelize = new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "nanoRSS.sqlite"), isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger, operatorsAliases: false});

  /**
   * Helper functons
   */
  var normalizeUsername = function(username){
    return username !== undefined ? username.toLowerCase().trim() : undefined;
  };

  var cryptopbkdf2 = util.promisify(crypto.pbkdf2);
  var cryptoRandomBytes = util.promisify(crypto.randomBytes);

  var hashPassword = async function(password, salt, options){
    if(options === null || options === undefined)
      options = {
        iterations: 10000,
        keylen: 512,
        digest: 'sha512',
        saltlen: 256
      };
    var pbkdf2 = async function(salt){
      var hash = await cryptopbkdf2(password, salt, options.iterations, options.keylen, options.digest);
      hash = hash.toString('hex');
      options =  {
        iterations: options.iterations,
        keylen: options.keylen,
        digest: options.digest
      };
      return JSON.stringify({salt: salt, hash:hash, options: options});
    };
    if(salt === null || salt === undefined) {
      salt = await cryptoRandomBytes(options.saltlen);
      salt = salt.toString('hex');
    }
    return pbkdf2(salt);
  };

  var tokenExpireDate = function(){
    var expireDate = new Date();
    var expireDays = parseFloat(process.env.TOKEN_EXPIRES_DAYS || 14);
    var expireMillis = expireDays * 24 * 60 * 60 * 1000;
    expireDate.setTime(expireDate.getTime() - expireMillis);
    return expireDate;
  };

  var feedItemExpireDate = function(){
    var expireDate = new Date();
    var expireDays = parseFloat(process.env.ITEM_EXPIRE_DAYS || 30);
    var expireMillis = expireDays * 24 * 60 * 60 * 1000;
    expireDate.setTime(expireDate.getTime() - expireMillis);
    return expireDate;
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
  User.prototype.verifyPassword = async function(password){
    var instance = this;
    if(instance.getDataValue('password') === undefined || instance.getDataValue('password') === null)
      throw new Error("Password is not set");
    var storedUserPassword = JSON.parse(instance.getDataValue('password'));
    var hashedPassword = await hashPassword(password, storedUserPassword.salt, storedUserPassword.options)
    return JSON.parse(hashedPassword).hash === storedUserPassword.hash;
  };

  var Token = sequelize.define('Token', {
    id: {
      type: Sequelize.STRING,
      primaryKey: true
    }
  }, {
    timestamps: true
  });

  var Feed = sequelize.define('Feed', {
    url: {
      type: Sequelize.STRING,
      primaryKey: true
    }
  }, {
    timestamps: true
  });

  //TODO: reuse PageMonitorItem across users?
  var PageMonitorItem = sequelize.define('PageMonitorItem', {
    url: Sequelize.STRING,
    match: Sequelize.STRING,
    replace: Sequelize.STRING,
    flags: Sequelize.STRING,
    title: Sequelize.STRING,
    contents: Sequelize.TEXT,
    delta: Sequelize.TEXT,
    error: Sequelize.TEXT
  }, {
    timestamps: true
  });

  var FeedItem = sequelize.define('FeedItem', {
    guid: {
      type: Sequelize.STRING,
      unique: true
    },
    title: Sequelize.TEXT,
    date: Sequelize.DATE,
    contents: Sequelize.TEXT,
    url: Sequelize.TEXT
  }, {
    timestamps: true
  });

  var UserFeed = sequelize.define('UserFeed', {
    title: Sequelize.TEXT,
  }, {
    timestamps: true
  });

  /**
   * Hooks
   */
  var userPasswordHashingHook = async function(user, options) {
    if (!user.changed('password'))
      return;
    
    var hashedPassword = await hashPassword(user.getDataValue('password'), null, null);
    user.setDataValue('password', hashedPassword);
    return null;
  };
  var userPagemonitorConfigurationParsingHook = async function(user, options){
    if (!user.changed('pagemonitor'))
      return;
    var existingItems = await user.getPageMonitorItems()
    var pages = await pagemonitorConfigparser.parsePageMonitorXML(user.getDataValue('pagemonitor'));
    var findExistingItem = function(page) {
      return existingItems.find(function(checkPage) {
        return checkPage.url === page.url && checkPage.flags === page.flags && checkPage.match === page.match && checkPage.replace === page.replace;
      });
    };
    var items = await Promise.all(pages.map(function(page){
      var existingItem = findExistingItem(page);
      return existingItem !== undefined? existingItem.update(page) : PageMonitorItem.create(page);
    }));
    return user.setPageMonitorItems(items);
  };
  var userFeedConfigurationParsingHook = async function(user, options){
    if (!user.changed('opml'))
      return;
    var existingFeeds = await user.getUserFeeds();
    var feeds = await feedConfigparser.parseOPML(user.getDataValue('opml'));
    var findExistingFeed = function(feedUrl) {
      return existingFeeds.find(function(checkFeed) {
        return checkFeed.url === feedUrl;
      });
    };
    var userFeeds = await Promise.all(Object.keys(feeds).map(async function(feedUrl){
      var existingFeed = findExistingFeed(feedUrl);
      if(existingFeed !== undefined) {
        existingItem.title = feeds[feedUrl];
        return existingItem.save();
      } else {
        var userFeed = await UserFeed.create({title: feeds[feedUrl]});
        var feed = await Feed.findByPk(feedUrl);
        if(feed === null)
          feed = await Feed.create({url: feedUrl});
        await feed.addUserFeed(userFeed);
        return userFeed;
      }
    }));
    return user.setUserFeeds(userFeeds);
  };
  User.addHook('beforeCreate', userPasswordHashingHook);
  User.addHook('beforeUpdate', userPasswordHashingHook);
  User.addHook('afterUpdate', userPagemonitorConfigurationParsingHook);
  User.addHook('afterUpdate', userFeedConfigurationParsingHook);

  /**
   * Associations
   */
  User.hasMany(PageMonitorItem);
  PageMonitorItem.belongsTo(User);
  FeedItem.belongsTo(Feed);
  Feed.hasMany(FeedItem, {onDelete: 'cascade'});
  User.hasMany(Token, {onDelete: 'cascade'});
  Token.belongsTo(User);
  UserFeed.belongsTo(User);
  UserFeed.belongsTo(Feed);
  User.hasMany(UserFeed);
  Feed.hasMany(UserFeed);

  /**
   * Exports
   */
  var init = async function(options) {
    await sequelize.sync(options);
    //Create default user if none exists
    await getUserData();
    return null;
  };

  var close = function() {
    return sequelize.close();
  }

  var findUser = function(username) {
    return User.findOne({where: {username: normalizeUsername(username)}});
  };

  var getUserData = async function(){
    //TODO: check username
    //TODO: this is not transacted and so is not safe from race conditions
    var user = await User.findOne()
    if(user === null)
      return User.create({username: 'default', password: "default"});
    return user;
  };

  var findToken = async function(token){
    var token = await Token.findByPk(token, {include: [User]})
    if(token === undefined || token === null)
      return null;
    if(new Date(token.updatedAt) < tokenExpireDate()) {
      await token.destroy();
      return false;
    }
    return token;
  };

  var cleanupExpiredTokens = function() {
    return Token.destroy({where: {[Sequelize.Op.or]: [{updatedAt: {[Sequelize.Op.lt]: tokenExpireDate()}}, {UserId: null}]}});
  };

  var cleanupOrphanedPageMonitorItems = function() {
    return PageMonitorItem.destroy({where: {UserId: null}});
  };

  var cleanupOrphanedFeeds = async function() {
    await UserFeed.destroy({where: {UserId: null}});
    var feeds = await Feed.findAll({include: UserFeed});
    return Promise.all(feeds.filter(function(feed) {
      return feed.UserFeeds.length === 0;
    }).map(function(feed) {
      return feed.destroy();
    }));
  };

  var cleanupExpiredFeedItems = function() {
    return FeedItem.destroy({where: {updatedAt: {[Sequelize.Op.lt]: feedItemExpireDate()}}});
  };

  var saveFeed = async function(url, items){
    var feed = await Feed.findOne({where: {url: url}})
    if(feed === null)
      feed = await Feed.create({url: url});
    var savedItems = await Promise.all(items.map(async function(item){
      var savedItem = await FeedItem.findOne({where: {guid: item.guid}});
      if(savedItem === null)
        savedItem = await FeedItem.create(item);
      //Force Sequelize update of updatedAt
      savedItem.changed('guid', true);
      return savedItem.update(item);
    }));
    return feed.addFeedItems(savedItems);
  };

  var getPageMonitorItems = function(){
    //TODO: check username associations
    //TODO: keep a version returning all PageMonitorItems (for fetcher)
    return PageMonitorItem.findAll();
  };

  var findPageMonitorItem = function(id, findAttribute){
    if(findAttribute !== 'id' && findAttribute !== 'url')
      findAttribute = 'id';
    return PageMonitorItem.findOne({where: {[findAttribute]: id}});
  };

  var getFeedItems = function(){
    //TODO: check username associations
    return FeedItem.findAll({include: Feed});
  };

  var getUserFeeds = function(){
    //TODO: check username associations
    return UserFeed.findAll({include: {model: Feed, include: FeedItem}});
  };

  var getFeeds = function(){
    //TODO: check username associations
    //TODO: keep a version returning all Feeds (for fetcher)
    return Feed.findAll({include: FeedItem});
  };

  var findFeedItem = function(id){
    //TODO: check username associations
    return FeedItem.findOne({where: {id: id}});
  };

  return {
    init: init,
    close: close,
    getUserData: getUserData,
    findUser: findUser,
    findToken: findToken,
    cleanupExpiredTokens: cleanupExpiredTokens,
    cleanupOrphanedPageMonitorItems: cleanupOrphanedPageMonitorItems,
    cleanupOrphanedFeeds: cleanupOrphanedFeeds,
    cleanupExpiredFeedItems: cleanupExpiredFeedItems,
    saveFeed: saveFeed,
    findPageMonitorItem: findPageMonitorItem,
    getPageMonitorItems: getPageMonitorItems,
    findFeedItem: findFeedItem,
    getFeedItems: getFeedItems,
    getUserFeeds: getUserFeeds,
    getFeeds: getFeeds
  };
};

module.exports.model = sequelizeConfigurer;
