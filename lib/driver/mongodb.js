var util = require('util');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var Base = require('./base');
var type = require('../data_type');
var log = require('../log.js');
var Promise = require('bluebird');

var connectionString, internals = {};

var MongodbDriver = Base.extend({

  init: function(connection, mongoString) {
    this._super(internals);
    this.connection = connection;
    connectionString = mongoString;
  },

  /**
   * Creates the migrations collection
   *
   * @param callback
   */
  _createMigrationsCollection: function(callback) {
    return this._run('createCollection', internals.migrationTable, null)
      .nodeify(callback);
  },


  /**
   * Creates the seed collection
   *
   * @param callback
   */
  _createSeedsCollection: function(callback) {
    return this._run('createCollection', internals.seedTable, null)
      .nodeify(callback);
  },


  /**
   * Creates the seeder collection
   *
   * @param callback
   */
  _createSeedsCollection: function(callback) {
    return this._run('createCollection', internals.seedTable, null)
      .nodeify(callback);
  },

  /**
   * An alias for _createMigrationsCollection
   */
  createMigrationsTable: function(callback) {
    this._createMigrationsCollection(callback);
  },

  /**
   * An alias for _createSeederCollection
   */
  createSeedsTable: function(callback) {
    this._createSeedsCollection(callback);
  },

  /**
   * Creates a collection
   *
   * @param collectionName  - The name of the collection to be created
   * @param callback
   */
  createCollection: function(collectionName, callback) {
    return this._run('createCollection', collectionName, null)
      .nodeify(callback);
  },

  switchDatabase: function(options, callback) {

    if(typeof(options) === 'object')
    {
      if(typeof(options.database) === 'string')
        return this._run('use', options, null)
          .nodeify(callback);
    }
    else if(typeof(options) === 'string')
    {
      return this._run('use', options, null)
        .nodeify(callback);
    }
    else
      return Promise.resolve().nodeify(callback);
  },

  createDatabase: function(dbName, options, callback) {
    //Don't care at all, MongoDB auto creates databases
    if(typeof(options) === 'function')
      callback = options;

    return Promise.resolve().nodeify(callback);
  },

  dropDatabase: function(dbName, options, callback) {

    if(typeof(options) === 'function')
      callback = options;

    return this._run('dropDatabase', dbName, null)
      .nodeify(callback);
  },

  /**
   * An alias for createCollection
   *
   * @param collectionName  - The name of the collection to be created
   * @param callback
   */
  createTable: function(collectionName, callback) {
    this.createCollection(collectionName, callback);
  },

  /**
   * Drops a collection
   *
   * @param collectionName  - The name of the collection to be dropped
   * @param callback
   */
  dropCollection: function(collectionName, callback) {
    return this._run('dropCollection', collectionName, null)
      .nodeify(callback);
  },

  /**
   * An alias for dropCollection
   *
   * @param collectionName  - The name of the collection to be dropped
   * @param callback
   */
  dropTable: function(collectionName, callback) {
    this.dropCollection(collectionName, callback);
  },

  /**
   * Renames a collection
   *
   * @param collectionName    - The name of the existing collection to be renamed
   * @param newCollectionName - The new name of the collection
   * @param callback
   */
  renameCollection: function(collectionName, newCollectionName, callback) {
    return this._run('renameCollection', collectionName, {newCollection: newCollectionName})
      .nodeify(callback);
  },

  /**
   * An alias for renameCollection
   *
   * @param collectionName    - The name of the existing collection to be renamed
   * @param newCollectionName - The new name of the collection
   * @param callback
   */
  renameTable: function(collectionName, newCollectionName, callback) {
    return this.renameCollection(collectionName, newCollectionName)
      .nodeify(callback);
  },

  /**
   * Adds an index to a collection
   *
   * @param collectionName  - The collection to add the index to
   * @param indexName       - The name of the index to add
   * @param columns         - The columns to add an index on
   * @param	unique          - A boolean whether this creates a unique index
   */
  addIndex: function(collectionName, indexName, columns, unique, callback) {

    var options = {
      indexName: indexName,
      columns: columns,
      unique: unique
    };

    return this._run('createIndex', collectionName, options)
      .nodeify(callback);
  },

  /**
   * Removes an index from a collection
   *
   * @param collectionName  - The collection to remove the index
   * @param indexName       - The name of the index to remove
   * @param columns
   */
  removeIndex: function(collectionName, indexName, callback) {
    return this._run('dropIndex', collectionName, {indexName: indexName})
      .nodeify(callback);
  },

  /**
   * Inserts a record(s) into a collection
   *
   * @param collectionName  - The collection to insert into
   * @param toInsert        - The record(s) to insert
   * @param callback
   */
  insert: function(collectionName, toInsert, callback) {
    return this._run('insert', collectionName, toInsert)
      .nodeify(callback);
  },

  /**
   * Inserts a migration record into the migration collection
   *
   * @param name                - The name of the migration being run
   * @param callback
   */
  addMigrationRecord: function (name, callback) {
    return this._run('insert', internals.migrationTable, {name: name, run_on: new Date})
      .nodeify(callback);
  },

  /**
   * Inserts a seeder record into the seeder collection
   *
   * @param name                - The name of the seed being run
   * @param callback
   */
  addSeedRecord: function (name, callback) {
    return this._run('insert', internals.seedTable, {name: name, run_on: new Date})
      .nodeify(callback);
  },

  /**
   * Runs a query
   *
   * @param collectionName  - The collection to query on
   * @param query           - The query to run
   * @param callback
   */
  _find: function(collectionName, query, callback) {
    return this._run('find', collectionName, query)
      .nodeify(callback);
  },

  /**
   * Gets all the collection names in mongo
   *
   * @param callback  - The callback to call with the collection names
   */
  _getCollectionNames: function(callback) {
    return this._run('collections', null, null)
      .nodeify(callback);
  },

  /**
   * Gets all the indexes for a specific collection
   *
   * @param collectionName  - The name of the collection to get the indexes for
   * @param callback        - The callback to call with the collection names
   */
  _getIndexes: function(collectionName, callback) {
    return this._run('indexInformation', collectionName, null)
      .nodeify(callback);
  },

  /**
   * Gets a connection and runs a mongo command and returns the results
   *
   * @param command     - The command to run against mongo
   * @param collection  - The collection to run the command on
   * @param options     - An object of options to be used based on the command
   * @param callback    - A callback to return the results
   */
  _run: function(command, collection, options, callback) {

    var args = this._makeParamArgs(arguments),
        sort = null,
        callback = args[2];

    log.sql.apply(null, arguments);

    if(options && typeof(options) === 'object') {

      if(options.sort)
        sort = options.sort;
    }

    if(internals.dryRun) {
      return Promise.resolve().nodeify(callback);
    }

    return new Promise(function(resolve, reject) {
      var prCB = function(err, data) {
        return (err ? reject(err) : resolve(data));
      };

      // Get a connection to mongo
      this.connection.connect(connectionString, function(err, db) {

        if(err) {
          prCB(err);
        }

        // Callback function to return mongo records
        var callbackFunction = function(err, data) {

          if(err) {
            prCB(err);
          }

          prCB(null, data);
          db.close();
        };

        // Depending on the command, we need to use different mongo methods
        switch(command) {
          case 'find':

            if(sort) {
              db.collection(collection)[command](options.query).sort(sort).toArray(callbackFunction);
            }
            else {
              db.collection(collection)[command](options).toArray(callbackFunction);
            }
            break;
          case 'renameCollection':
            db[command](collection, options.newCollection, callbackFunction);
            break;
          case 'createIndex':
            db[command](collection, options.columns, {name: options.indexName, unique: options.unique}, callbackFunction);
            break;
          case 'dropIndex':
            db.collection(collection)[command](options.indexName, callbackFunction);
            break;
          case 'insert':
            // options is the records to insert in this case
            if(util.isArray(options))
              db.collection(collection).insertMany(options, {}, callbackFunction);
            else
              db.collection(collection).insertOne(options, {}, callbackFunction);
            break;
          case 'remove':
            // options is the records to insert in this case
            if(util.isArray(options))
              db.collection(collection).deleteMany(options, callbackFunction);
            else
              db.collection(collection).deleteOne(options, callbackFunction);
            break;
          case 'collections':
            db.collections(callbackFunction);
            break;
          case 'indexInformation':
            db.indexInformation(collection, callbackFunction);
            break;
          case 'dropDatabase':
            db.dropDatabase(callbackFunction);
            break;
          case 'use':
            db.db(collection, callbackFunction);
            break;
          default:
            db[command](collection, callbackFunction);
            break;
        }
      });
    }.bind(this)).nodeify(callback);
  },

  _makeParamArgs: function(args) {
    var params = Array.prototype.slice.call(args);
    var sql = params.shift();
    var callback = params.pop();

    if (params.length > 0 && Array.isArray(params[0])) {
      params = params[0];
    }

    return [sql, params, callback];
  },

  /**
   * Runs a NoSQL command regardless of the dry-run param
   */
  _all: function() {
    var args = this._makeParamArgs(arguments);
    return this.connection.query.apply(this.connection, args);
  },

  /**
   * Queries the migrations collection
   *
   * @param callback
   */
  allLoadedMigrations: function(callback) {
    return this._run('find', internals.migrationTable, { sort: { run_on: -1 } })
      .nodeify(callback);
  },

  /**
   * Queries the seed collection
   *
   * @param callback
   */
  allLoadedSeeds: function(callback) {
    return this._run('find', internals.seedTable, { sort: { run_on: -1 } })
      .nodeify(callback);
  },

  /**
   * Deletes a migration
   *
   * @param migrationName       - The name of the migration to be deleted
   * @param callback
   */
  deleteMigration: function(migrationName, callback) {
    return this._run('remove', internals.migrationTable, {name: migrationName})
      .nodeify(callback);
  },

  /**
   * Deletes a migration
   *
   * @param migrationName       - The name of the migration to be deleted
   * @param callback
   */
  deleteSeed: function(migrationName, callback) {
    return this._run('remove', internals.seedTable, {name: migrationName})
      .nodeify(callback);
  },

  /**
   * Closes the connection to mongodb
   */
  close: function(callback) {
    return new Promise(function(resolve, reject) {
      var cb = (function(err, data) {
        return (err ? reject(err) : resolve(data));
      });

      this.connection.close(cb);
    }.bind(this)).nodeify(callback);
  },

  buildWhereClause: function() {

    return Promise.reject('There is no NoSQL implementation yet!');
  },

  update: function() {

    return Promise.reject('There is no NoSQL implementation yet!');
  }
});

Promise.promisifyAll(MongodbDriver);

/**
 * Gets a connection to mongo
 *
 * @param config    - The config to connect to mongo
 * @param callback  - The callback to call with a MongodbDriver object
 */
exports.connect = function(config, intern, callback) {
  var db;
  var port;
  var host;

  internals = intern;

  // Make sure the database is defined
  if(config.database === undefined) {
    throw new Error('database must be defined in database.json');
  }

  if(config.host === undefined) {
    host = 'localhost';
  } else {
    host = config.host;
  }

  if(config.port === undefined) {
    port = 27017;
  } else {
    port = config.port;
  }

  var mongoString = 'mongodb://';

  if(config.user !== undefined && config.password !== undefined) {
    mongoString += config.user + ':' + config.password + '@';
  }

  mongoString += host + ':' + port + '/' + config.database;

  db = config.db || new MongoClient(new Server(host, port));
  callback(null, new MongodbDriver(db, mongoString));
};
