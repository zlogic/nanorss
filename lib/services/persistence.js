var Sequelize = require('sequelize');
var persistenceconfiguration = require('./persistenceconfiguration');
var crypto = require('crypto');
var i18n = require('i18n');

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

var hashPassword = function(password, salt, options){
  return new Promise(function(resolve, reject) {
    if(options === null || options === undefined)
      options = {
        iterations: 10000,
        keylen: 512,
        digest: 'sha512',
        saltlen: 256
      };
    var pbkdf2 = function(salt){
      crypto.pbkdf2(password, salt, options.iterations, options.keylen, options.digest, function(err, hash){
        if(err)
          return reject(err);
        hash = hash.toString('hex');
        options =  {
          iterations: options.iterations,
          keylen: options.keylen,
          digest: options.digest
        };
        resolve(JSON.stringify({salt: salt, hash:hash, options: options}));
      });
    };
    if(salt === null || salt === undefined)
      crypto.randomBytes(options.saltlen, function(err, salt){
        if(err)
          return reject(err);
        salt = salt.toString('hex');
        pbkdf2(salt);
      });
    else
      pbkdf2(salt);
  });
};

var tokenExpireDate = function(){
  var expireDate = new Date();
  var expireDays = parseFloat(process.env.TOKEN_EXPIRES_DAYS || 14);
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
  timestamps: false,
  instanceMethods: {
    verifyPassword: function(password){
      var instance = this;
      return new Promise(function(resolve, reject) {
        if(instance.getDataValue('password') === undefined || instance.getDataValue('password') === null){
          return reject(new Error(i18n.__("Password is not set")));
        }
        var storedUserPassword = JSON.parse(instance.getDataValue('password'));
        hashPassword(password, storedUserPassword.salt, storedUserPassword.options).then(function(result){
          resolve(JSON.parse(result).hash === storedUserPassword.hash);
        }).catch(reject);
      });
    }
  }
});

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
 * Hooks
 */
var userPasswordHashingHook = function(user, options, done){
 if (!user.changed('password'))
   return done();
 hashPassword(user.getDataValue('password'), null, null).then(function(result){
   user.setDataValue('password', result);
   done();
 }).catch(done);
};
User.hook('beforeCreate', userPasswordHashingHook);
User.hook('beforeUpdate', userPasswordHashingHook);

/**
 * Associations
 */
FeedItem.belongsTo(Feed);
Feed.hasMany(FeedItem, {onDelete: 'cascade'});
User.hasMany(Token, {onDelete: 'cascade'});
Token.belongsTo(User);

/**
 * Exports
 */
var init = function(options) {
  return sequelize.sync(options);
};

var findUser = function(username) {
  return User.findOne({where: {username: normalizeUsername(username)}});
};

var getUserData = function(){
  //TODO: check username
  //TODO: this is not transacted and so is not safe from race conditions
  return User.findOne().then(function(user){
    if(user === null)
      return User.create({username: 'default', password: "default"});
    return user;
  });
};

var findToken = function(token){
  return Token.findById(token, {include: [User]}).then(function(token) {
    if(token === undefined || token === null)
      return null;
    if(new Date(token.updatedAt) <= tokenExpireDate())
      return token.destroy().then(function(){
        return false;
      });
    return token;
  });
};

var cleanupExpiredTokens = function() {
  return Token.destroy({where: {updatedAt: {$lt: tokenExpireDate()}}});
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
module.exports.findUser = findUser;
module.exports.findToken = findToken;
module.exports.cleanupExpiredTokens = cleanupExpiredTokens;
module.exports.savePageMonitorItem = savePageMonitorItem;
module.exports.saveFeed = saveFeed;
module.exports.findPageMonitorItem = findPageMonitorItem;
module.exports.getPageMonitorItems = getPageMonitorItems;
module.exports.findFeedItem = findFeedItem;
module.exports.getFeedItems = getFeedItems;
module.exports.getFeeds = getFeeds;
