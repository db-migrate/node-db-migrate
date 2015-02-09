var util = require('util');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var Base = require('./base');
var type = require('../data_type');
var log = require('../log');

var global = {};

var MongodbDriver = Base.extend({
  init: function(connection) {
    this._super();
    this.connection = connection;
  },
  
	/**
	 * Creates the migrations collection
	 *
	 * @param callback
	 */
	_createMigrationsCollection: function(callback) {
		this._run('createCollection', 'migrations', null, callback);
	},
	
	/**
	 * An alias for _createMigrationsCollection
	 */
	_createMigrationsTable: function(callback) {
		this._createMigrationsCollection(callback);
	},
	
  /**
	 * Creates a collection
	 *
	 * @param collectionName		- The name of the collection to be created
	 * @param callback
	 */
  createCollection: function(collectionName, callback) {
		this._run('createCollection', collectionName, null, callback);
  },
	
	/**
	 * An alias for createCollection
	 *
	 * @param collectionName		- The name of the collection to be created
	 * @param callback
	 */
	createTable: function(collectionName, callback) {
		this.createCollection(collectionName, callback);
	},

  /**
	 * Renames a collection
	 *
	 * @param collectionName		- The name of the existing collection to be renamed
	 * @param newCollectionName	- The new name of the collection
	 * @param callback
	 */
  renameCollection: function(collectionName, newCollectionName, callback) {
		this._run('renameCollection', collectionName, {newCollection: newCollectionName}, callback);
  },
	
  /**
	 * An alias for renameCollection
	 *
	 * @param collectionName		- The name of the existing collection to be renamed
	 * @param newCollectionName	- The new name of the collection
	 * @param callback
	 */
  renameTable: function(collectionName, newCollectionName, callback) {
		this.renameCollection(collectionName, newCollectionName, callback);
  },
  
  /**
	 * Drops a collection
	 *
	 * @param collectionName		- The name of the collection to be dropped
	 * @param callback
	 */
	dropCollection: function(collectionName, callback) {		
		this._run('dropCollection', collectionName, null, callback);
	},
	
  /**
	 * An alias for dropCollection
	 *
	 * @param collectionName		- The name of the collection to be dropped
	 * @param callback
	 */
	dropTable: function(collectionName, callback) {		
		this.dropCollection(collectionName, callback);
	},

	/**
	 * Adds an index to a collection
	 *
	 * @param collectionName	- The collection to add the index to
	 * @param indexName				- The name of the index to add
	 * @param columns					- The columns to add an index on
	 * @param	unique					- A boolean whether this creates a unique index
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
	 * @param collectionName	- The collection to remove the index
	 * @param indexName				- The name of the index to remove
	 * @param columns
	 */
  removeIndex: function(collectionName, indexName, callback) {		
		this._run('dropIndex', collectionName, {indexName: indexName}, callback);  
	},
  
	/**
	 * Inserts a record(s) into a collection
	 *
	 * @param collectionName	- The collection to insert into
	 * @param toInsert				- The record(s) to insert
	 * @param callback
	 */
  insert: function(collectionName, toInsert, callback) {
		this._run('insert', collectionName, toInsert, callback);
  },
	
	/**
	 * Inserts a migration record into the migration collection
	 *
	 * @param name			- The name of the migration being run
	 * @param callback
	 */
  addMigrationRecord: function (name, callback) {
		this._run('insert', 'migrations', {name: name, run_on: new Date}, callback);
  },
	
	/**
	 * Runs a query
	 * 
	 * @param collectionName	- The collection to query on
	 * @param query						- The query to run
	 * @param callback
	 */
	find: function(collectionName, query, callback) {
		this._run('find', collectionName, query, callback);
	},
	
	/**
	 * Gets all the collection names in mongo
	 *
	 * @param callback	- The callback to call with the collection names
	 */
	//_getCollectionNames: function(callback) {
	getCollectionNames: function(callback) {
		this._run('collections', null, null, callback);		
	},
	
	/**
	 * Gets all the indexes for a specific collection
	 *
	 * @param collectionName	- The name of the collection to get the indexes for
	 * @param callback				- The callback to call with the collection names
	 */
	getIndexes: function(collectionName, callback) {
		this._run('indexInformation', collectionName, null, callback);
	},
			
	/**
	 * Gets a connection and runs a mongo command and returns the results
	 *
	 * @param command			- The command to run against mongo
	 * @param collection	- The collection to run the command on
	 * @param options			- An object of options to be used based on the command
	 * @arapm callback		- A callback to return the results
	 */
	_run: function(command, collection, options, callback) {
		
    var args = this._makeParamArgs(arguments);
    var callback = args[2];
    log.sql.apply(null, arguments);
    if(global.dryRun) {
      return callback();
    }
		
		var connectionString = 'mongodb://' + global.config.host + ':' + global.config.port + '/' + global.config.database;
		
		this.connection.connect(connectionString, function(err, db) {
			
			if(err) {
				return callback(err);
			}
			
			if(command === 'find') {
				// options is the query in this case
				db.collection(collection)[command](options).toArray(function(err, docs) {

					if(err) {
						return callback(err);
					}
				
					callback(null, docs);
					db.close();
				});
			}
			
			else if(command === 'renameCollection') {
				db[command](collection, options.newCollection, function(err, data) {

					if(err) {
						return callback(err);
					}
				
					callback(null, data);
					db.close();
				});
			} else if(command === 'createIndex') {

				db[command](collection, options.columns, {name: options.indexName, unique: options.unique}, function(err, data) {

					if(err) {
						return callback(err);
					}
				
					callback(null, data);
					db.close();
				});
			}
		  else if(command === 'dropIndex') {
				
		 		db.collection(collection)[command](options.indexName, function(err, data) {

					if(err) {
						return callback(err);
					}
				
					callback(null, data);
					db.close();
				});
			}
			else if(command === 'insert') {

				// options is the records to insert in this case
				db.collection(collection)[command](options, {}, function(err, docs) {
					
					if(err) {
						return callback(err);
					}
				
					callback(null, docs);
					db.close();
				});
			}
			
			else if(command === 'remove') {

				// options is the records to insert in this case
				db.collection(collection)[command]({name:options.toRemove}, function(err, docs) {

					if(err) {
						return callback(err);
					}
				
					callback(null, docs);
					db.close();
				});
			}
			else if(command === 'collections') {
				db.collections(function(err, collections) {
				
					if(err) {
						return callback(err);
					}
					
					callback(null, collections);
					db.close();
				});
			}
			else if(command === 'indexInformation') {
				db.indexInformation(collection, function(err, indexInfo) {
					
					if(err) {
						return callback(err);
					}
					
					callback(null, indexInfo);
					db.close();
				});
			}
			else {
				db[command](collection, function(err, data) {

					if(err) {
						return callback(err);
					}
				
					callback(null, data);
					db.close();
				});
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

  
  all: function() {
		var args = this._makeParamArgs(arguments);
		return this.connection.query.apply(this.connection, args);
  },
  
	/**
	 * Queries the migrations collection
	 *
	 * @param callback
	 */
	_allLoadedMigrations: function(callback) {
		this._run('find', 'migrations', null, callback);
	},
	
	/**
	 * Deletes a migration
	 * 
	 * @param migrationName	- The name of the migration to be deleted
	 */
	_deleteMigration: function(migrationName, callback) {
		this._run('remove', 'migrations', {toRemove: migrationName}, callback);
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
 * @param config		- The config to connect to mongo
 * @param callback	- The callback to call with a MongodbDriver object
 */
exports.connect = function(config, callback) {
  var db;
	var port;
	
	// Set the default port if one is not defined
	if(config.port === undefined) {
		config.port = '27017';
	}
	
	global.config = config;	// Expose this to the object. TODO Need to find a better way to do this.
	
  db = config.db || new MongoClient(new Server(config.server, port));
  callback(null, new MongodbDriver(db));
};
