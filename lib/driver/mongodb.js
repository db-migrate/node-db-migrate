var util = require('util');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var Base = require('./base');
var type = require('../data_type');
var log = require('../log');

var connectionString;

var MongodbDriver = Base.extend({

  init: function(connection, mongoString) {
    this._super();
    this.connection = connection;
    connectionString = mongoString;
  },

  /**
   * Creates the migrations collection
   *
   * @param callback
   */
  _createMigrationsCollection: function(callback) {
    this._run('createCollection', global.migrationTable, null, callback);
  },

  /**
   * An alias for _createMigrationsCollection
   */
  createMigrationsTable: function(callback) {
    this._createMigrationsCollection(callback);
  },

  /**
   * Creates a collection
   *
   * @param collectionName  - The name of the collection to be created
   * @param callback
   */
  createCollection: function(collectionName, callback) {
    this._run('createCollection', collectionName, null, callback);
  },

  switchDatabase: function(options, callback) {

    if(typeof(options) === 'object')
    {
      if(typeof(options.database) === 'string')
        this._run('use', options, null, callback);
    }
    else if(typeof(options) === 'string')
    {
      this._run('use', options, null, callback);
    }
    else
      callback(null);
  },

  createDatabase: function(dbName, options, callback) {
    //Don't care at all, MongoDB auto creates databases
    if(typeof(options) === 'function')
      callback = options;

    callback(null);
  },

  dropDatabase: function(dbName, options, callback) {

    if(typeof(options) === 'function')
      callback = options;

    this._run('dropDatabase', dbName, null, callback);
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
    this._run('dropCollection', collectionName, null, callback);
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
    this._run('renameCollection', collectionName, {newCollection: newCollectionName}, callback);
  },

  /**
   * An alias for renameCollection
   *
   * @param collectionName    - The name of the existing collection to be renamed
   * @param newCollectionName - The new name of the collection
   * @param callback
   */
  renameTable: function(collectionName, newCollectionName, callback) {
    this.renameCollection(collectionName, newCollectionName, callback);
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

    this._run('createIndex', collectionName, options, callback);
  },

  /**
   * Removes an index from a collection
   *
   * @param collectionName  - The collection to remove the index
   * @param indexName       - The name of the index to remove
   * @param columns
   */
  removeIndex: function(collectionName, indexName, callback) {
    this._run('dropIndex', collectionName, {indexName: indexName}, callback);
  },

  /**
   * Inserts a record(s) into a collection
   *
   * @param collectionName  - The collection to insert into
   * @param toInsert        - The record(s) to insert
   * @param callback
   */
  insert: function(collectionName, toInsert, callback) {
    this._run('insert', collectionName, toInsert, callback);
  },

  /**
   * Inserts a migration record into the migration collection
   *
   * @param name                - The name of the migration being run
   * @param callback
   */
  addMigrationRecord: function (name, callback) {
    this._run('insert', global.migrationTable, {name: name, run_on: new Date}, callback);
  },

  /**
   * Runs a query
   *
   * @param collectionName  - The collection to query on
   * @param query           - The query to run
   * @param callback
   */
  _find: function(collectionName, query, callback) {
    this._run('find', collectionName, query, callback);
  },

  /**
   * Gets all the collection names in mongo
   *
   * @param callback  - The callback to call with the collection names
   */
  _getCollectionNames: function(callback) {
    this._run('collections', null, null, callback);
  },

  /**
   * Gets all the indexes for a specific collection
   *
   * @param collectionName  - The name of the collection to get the indexes for
   * @param callback        - The callback to call with the collection names
   */
  _getIndexes: function(collectionName, callback) {
    this._run('indexInformation', collectionName, null, callback);
  },

  /**
   * Gets a connection and runs a mongo command and returns the results
   *
   * @param command     - The command to run against mongo
   * @param collection  - The collection to run the command on
   * @param options     - An object of options to be used based on the command
   * @arapm callback    - A callback to return the results
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

    if(global.dryRun) {
      return callback();
    }

    // Get a connection to mongo
    this.connection.connect(connectionString, function(err, db) {

      if(err) {
        return callback(err);
      }

      // Callback function to return mongo records
      var callbackFunction = function(err, data) {

        if(err) {
          return callback(err);
        }

        callback(null, data);
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
          db.collection(collection)[command](options, {}, callbackFunction);
          break;
        case 'remove':
          // options is the records to insert in this case
          db.collection(collection)[command]({name:options.toRemove}, callbackFunction);
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
    this._run('find', global.migrationTable, { sort: { run_on: -1 } }, callback);
  },

  /**
   * Deletes a migration
   *
   * @param migrationName       - The name of the migration to be deleted
   * @param callback
   */
  deleteMigration: function(migrationName, callback) {
    this._run('remove', global.migrationTable, {toRemove: migrationName}, callback);
  },

  /**
   * Closes the connection to mongodb
   */
  close: function(callback) {
    this.connection.close(callback);
  }
});

/**
 * Gets a connection to mongo
 *
 * @param config    - The config to connect to mongo
 * @param callback  - The callback to call with a MongodbDriver object
 */
exports.connect = function(config, callback) {
  var db;
  var port;
  var host;

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
