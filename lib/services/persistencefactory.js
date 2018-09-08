var Mongoose = require('mongoose').Mongoose;
var crypto = require('crypto');
var pagemonitorConfigparser = require('../pagemonitor/configparser');
var feedConfigparser = require('../feed/configparser');

var mongooseConfigurer = function(databaseUrl) {  
  var mongoose = new Mongoose();
  mongoose.set('useCreateIndex', true);

  /**
   * Helper functons
   */
  var hashPassword = function(password, salt, options){
    if(options === null || options === undefined)
      options = {
        iterations: 10000,
        keylen: 512,
        digest: 'sha512',
        saltlen: 256
      };
    var pbkdf2 = function(salt){
      return new Promise(function(resolve, reject) {
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
      });
    };
    if(salt === null || salt === undefined)  
      return new Promise(function(resolve, reject) {
        crypto.randomBytes(options.saltlen, function(err, salt){
          if(err)
            return reject(err);
          salt = salt.toString('hex');
          resolve(salt);
        });
      }).then(function(salt) {
        return pbkdf2(salt);
      });
    else
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
  var UserSchema = new mongoose.Schema({
    username: {
      type: String,
      lowercase: true,
      trim: true,
      index: { unique: true },
      required: true
    },
    password: {
      type: String,
      required: true
    },
    opml: {
      type: String
    },
    pagemonitor: {
      type: String
    },
    tokens: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Token'
    }],
    pageMonitorItems: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'PageMonitorItem'
    }],
    feeds: [{
      title: { type: String },
      feed: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Feed'
      }
    }]
  });

  var TokenSchema = new mongoose.Schema({
    token: {
      type: String,
      unique: true,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    }
  });
  
  var PageMonitorItemSchema = new mongoose.Schema({
    url: {
      type: String,
      required: true
    },
    match: String,
    replace: String,
    flags: String,
    title: {
      type: String,
      required: true
    },
    contents: String,
    delta: String,
    error: String,
    updatedAt: {
      type: Date,
      required: true
    },
  });

  var FeedSchema = new mongoose.Schema({
    url: {
      type: String,
      index: { unique: true },
      required: true
    },
    items: [{
      guid: {
        type: String,
        required: true
      },
      title: String,
      date: Date,
      lastSeen: {
        type: Date,
        required: true
      },
      contents: String,
      url: String
    }]
  });

  UserSchema.methods.verifyPassword = function(password) {
    var instance = this;
    if(instance.password === undefined || instance.password === null)
      return Promise.reject(new Error("Password is not set"));
    var storedUserPassword = JSON.parse(instance.password);
    return hashPassword(password, storedUserPassword.salt, storedUserPassword.options).then(function(result){
      return JSON.parse(result).hash === storedUserPassword.hash;
    });
  };

  /**
   * Hooks
   */
  var userPasswordHashingHook = function() {
    var user = this;
    if (!user.isModified('password'))
      return Promise.resolve();
    
    return hashPassword(user.password, null, null).then(function(result) {
      user.password = result;
      return null;
    });
  };
  var userPagemonitorConfigurationParsingHook = function(){
    var user = this;
    if (!user.isModified('pagemonitor'))
      return Promise.resolve();
    return pagemonitorConfigparser.parsePageMonitorXML(user.pagemonitor).then(function(pages){
      var findExistingItem = function(page) {
        return user.pageMonitorItems.find(function(checkPage) {
          return checkPage.url === page.url && checkPage.flags === page.flags && checkPage.match === page.match && checkPage.replace === page.replace;
        });
      };
      return Promise.all(pages.map(function(page){
        var existingItem = findExistingItem(page);
        page.updatedAt = new Date();
        if(existingItem!== undefined) {
          existingItem.set(page)
          return existingItem.save();
        }
        return PageMonitorItem.create(page);
      }));
    }).then(function(items) {
      user.set({pageMonitorItems: items});
    });
  };
  var userFeedConfigurationParsingHook = function(){
    var user = this;
    if (!user.isModified('opml'))
      return Promise.resolve();
    return feedConfigparser.parseOPML(user.opml).then(function(feeds){
      var findExistingFeed = function(feedUrl) {
        return user.feeds.find(function(checkFeed) {
          return checkFeed.feed.url === feedUrl;
        });
      };
      return Promise.all(Object.keys(feeds).map(function(feedUrl){
        var existingFeed = findExistingFeed(feedUrl);
        if(existingFeed !== undefined) {
          existingItem.title = feeds[feedUrl];
          return existingItem.save();
        } else {
          return Feed.findOne({url: feedUrl}).then(function(feed){
            if(feed === null)
              return Feed.create({url: feedUrl});
            return feed;
          }).then(function(feed) {
            return {title: feeds[feedUrl], feed: feed};
          });
        }
      }));
    }).then(function(userFeeds) {
      user.set({feeds: userFeeds});
    });
  };
  UserSchema.pre('save', userPasswordHashingHook);
  UserSchema.pre('save', userPagemonitorConfigurationParsingHook);
  UserSchema.pre('save', userFeedConfigurationParsingHook);

  var User = mongoose.model('User', UserSchema);
  var PageMonitorItem = mongoose.model('PageMonitorItem', PageMonitorItemSchema);
  var Feed = mongoose.model('Feed', FeedSchema);
  var Token = mongoose.model('Token', TokenSchema);

  /**
   * Exports
   */
  var connect = function() {
    if(databaseUrl === undefined)
      databaseUrl = process.env.DATABASE_URL || "mongodb://localhost/nanoRSS";
    return mongoose.connect(databaseUrl, { useNewUrlParser: true }).then(function() {
      //Create default user if none exists
      return getUserData();
    }).then(function() {
      return null;
    });
  };

  var disconnect = function() {
    return mongoose.disconnect();
  }

  var ensureIndexes = function() {
    return Promise.all([User.ensureIndexes(), PageMonitorItem.ensureIndexes(), Feed.ensureIndexes(), Token.ensureIndexes()]);
  }

  var findUser = function(username) {
    return User.findOne({username: username});
  };

  var getUserData = function(){
    //TODO: check username
    //TODO: this is not transacted and so is not safe from race conditions
    return User.findOne().then(function(user){
      if(user === null)
        return User.create({username: 'default', password: 'default'});
      return user;
    });
  };

  var getUserTokens = function(){
    //TODO: check username
    return User.findOne().populate('tokens').exec().then(function(user){
      if(user === null)
        return undefined;
      return user.tokens;
    });
  };

  var createUserToken = function(username, token) {
    var token = new Token({token: token, createdAt: new Date()});
    return token.save().then(function(token) {
      return User.findOne({username: username}).then(function(user){
        user.tokens.push(token);
        return user.save();
      });
    });
  };

  var deleteUserToken = function(token) {
    return Token.findOne({token: token}).then(function(token) {
      return User.findOne({'tokens': {$in: token}}).then(function(user){
        if(user === null)
          return undefined;
        user.tokens = user.tokens.filter(function(userToken){
          return userToken.token !== token;
        })
        return Promise.all([user.save(), Token.deleteOne({_id: token._id})]).then(function(){
          return user;
        });
      });
    });
  };

  var findUserByToken = function(token){
    return Token.findOne({token: token}).then(function(token) {
      if(token === null)
        return false;
      return User.findOne({'tokens': {$in: token}}).then(function(user) {
        if(user === null)
          return false;
        if(new Date(token.createdAt) < tokenExpireDate()){
          return deleteUserToken(token.token).then(function(){
            return false;
          });
        }
        return user;
      });
    });
  };

  var cleanupExpiredTokens = function() {
    return Token.deleteMany({createdAt: {$lt: tokenExpireDate()}}).then(function(){
      return User.find().then(function(users){
        return Promise.all(users.map(function(user){
          return Promise.all(user.tokens.map(function(token){ return Token.findOne(token)})).then(function(foundTokens){
            foundTokens = foundTokens.filter(function(foundToken){ return foundToken !== null});
            user.tokens = foundTokens;
            return user.save();
          });
        }));
      });
    });
  };

  var cleanupOrphanedPageMonitorItems = function() {
    return PageMonitorItem.aggregate([
      {$lookup: {from: User.collection.name, localField: '_id', foreignField: 'pageMonitorItems', as: 'users'}},
      {$project: {_id: 1, users: {$size: "$users"}}},
      {$match: {users: {$eq: 0}}}
    ]).then(function(orphanedItems){
      return PageMonitorItem.deleteMany({_id: {$in: orphanedItems}});
    });
  };

  var cleanupOrphanedFeeds = function() {
    return Feed.aggregate([
      {$lookup: {from: User.collection.name, localField: '_id', foreignField: 'feeds.feed', as: 'users'}},
      {$project: {_id: 1, users: {$size: "$users"}}},
      {$match: {users: {$eq: 0}}}
    ]).then(function(orphanedFeeds){
      return Feed.deleteMany({_id: {$in: orphanedFeeds}});
    });
  };

  var cleanupExpiredFeedItems = function() {
    return Feed.find({'items.lastSeen': {$lt: feedItemExpireDate()}}).then(function(feeds){
      return Promise.all(feeds.map(function(feed){
        feed.items = feed.items.filter(function(item){ return !(item.lastSeen < feedItemExpireDate()); });
        return feed.save();
      }));
    })
  };

  var saveFeed = function(url, items){
    return Feed.findOne({url: url}).then(function(feed) {
      if(feed === null)
        return Feed.create({url: url});
      return feed;
    }).then(function(feed){
      items.forEach(function(item){
        item.lastSeen = new Date();
        var savedItem = feed.items.find(function(feedItem){ return feedItem.guid === item.guid;});
        if(savedItem === undefined) {
          return feed.items.push(item);
        }
        savedItem.set(item);
      });
      return feed.save();
    });
  };

  var savePageMonitorItem = function(item) {
    item.updatedAt = new Date();
    return PageMonitorItem.findById(item._id).then(function(existingItem){
      existingItem.set(item);
      return existingItem.save();
    })
  };

  var getPageMonitorItems = function(){
    //TODO: check username associations
    //TODO: keep a version returning all PageMonitorItems (for fetcher)
    return PageMonitorItem.find({});
  };

  var findPageMonitorItem = function(id, findAttribute){
    if(findAttribute !== '_id' && findAttribute !== 'url')
      findAttribute = '_id';
    return PageMonitorItem.findOne().where(findAttribute, id);
  };

  var getUserFeeds = function(){
    //TODO: check username associations
    return User.findOne().populate('feeds.feed').exec().then(function(user){
      if(user === null)
        return undefined;
      return user.feeds;
    });
  }; 

  var getFeeds = function(){
    //TODO: check username associations
    //TODO: keep a version returning all Feeds (for fetcher)
    return Feed.find({});
  };

  var findFeedItem = function(id){
    //TODO: check username associations
    return Feed.findOne({'items._id': id},{items: {$elemMatch:{_id: {$eq: id}}}}).then(function(feed){
      if(feed === null)
        return undefined;
      return feed.items[0];
    });
  };

  return {
    mongoose: mongoose,
    init: connect,
    close: disconnect,
    ensureIndexes: ensureIndexes,
    getUserData: getUserData,
    findUser: findUser,
    findUserByToken: findUserByToken,
    createUserToken: createUserToken,
    deleteUserToken: deleteUserToken,
    getUserTokens: getUserTokens,
    cleanupExpiredTokens: cleanupExpiredTokens,
    cleanupOrphanedPageMonitorItems: cleanupOrphanedPageMonitorItems,
    cleanupOrphanedFeeds: cleanupOrphanedFeeds,
    cleanupExpiredFeedItems: cleanupExpiredFeedItems,
    saveFeed: saveFeed,
    savePageMonitorItem: savePageMonitorItem,
    findPageMonitorItem: findPageMonitorItem,
    getPageMonitorItems: getPageMonitorItems,
    findFeedItem: findFeedItem,
    getUserFeeds: getUserFeeds,
    getFeeds: getFeeds
  }
}

module.exports.model = mongooseConfigurer;
