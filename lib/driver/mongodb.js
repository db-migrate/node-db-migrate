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
	 * Creates a collection
	 *
	 * @param collectionName		- The name of the collection to be created
	 * @param callback
	 */
  createCollection: function(collectionName, callback) {
		this._run('createCollection', collectionName, null, callback);
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
	 * Drops a collection
	 *
	 * @param collectionName		- The name of the collection to be dropped
	 * @param callback
	 */
	dropCollection: function(collectionName, callback) {		
		this._run('dropCollection', collectionName, null, callback);
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
  

  addMigrationRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql('INSERT INTO migrations (`name`, `run_on`) VALUES (?, ?)', [name, formattedDate], callback);
  },
	
	find: function(collectionName, query, callback) {
		this._run('find', collectionName, query, callback);
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
		
		console.log('in run');
		console.log('command = '+command);
		console.log('collection = '+collection);
		console.log('options = ');
		console.log(options);

    var args = this._makeParamArgs(arguments);
    var callback = args[2];
    log.sql.apply(null, arguments);
    if(global.dryRun) {
      return callback();
    }
		
		var connectionString = 'mongodb://' + global.config.host + 
		':' + global.config.port + '/' + global.config.database;
		//console.log(connectionString);
		
		this.connection.connect(connectionString, function(err, db) {
			
			if(err) {
				console.log('first err = '+err);
				callback(err);
			}
			
			console.log('COMMAND = '+command);
			
			if(command === 'find') {
				console.log('in find');
				// options is the query in this case
				db.collection(collection)[command](options).toArray(function(err, docs) {
				//db.createCollection(collection, function(err, data) {
					console.log('in db callback');
					if(err) {
						console.log('err = '+err);
						callback(err);
					}
				
					console.log('docs = ');
					console.log(docs);
					callback(null, docs);
					db.close();
				});
			}
			
			else if(command === 'renameCollection') {
				console.log('in new collection');
				db[command](collection, options.newCollection, function(err, data) {
				//db.createCollection(collection, function(err, data) {
					console.log('in db callback');
					if(err) {
						console.log('err = '+err);
						callback(err);
					}
				
					//console.log('data = ');
					//console.log(data);
					callback(null, data);
					db.close();
				});
			} else if(command === 'createIndex') {
				console.log('in index ');
				
				console.log(options.columns);
				console.log(options.unique);
				
				db[command](collection, options.columns, {name: options.indexName, unique: options.unique}, function(err, data) {
				//db.createCollection(collection, function(err, data) {
					console.log('in db callback');
					if(err) {
						console.log('err = '+err);
						callback(err);
					}
				
					console.log('data = ');
					console.log(data);
					callback(null, data);
					db.close();
				});
			}
		  else if(command === 'dropIndex') {
		 				console.log('in drop index ');
				
		 				db.collection(collection)[command](options.indexName, function(err, data) {
		 				//db.createCollection(collection, function(err, data) {
		 					console.log('in db callback');
		 					if(err) {
		 						console.log('err = '+err);
		 						callback(err);
		 					}
				
		 					console.log('data = ');
		 					console.log(data);
		 					callback(null, data);
		 					db.close();
		 				});
		 			}
			else if(command === 'insert') {
				console.log('in insert');
				// options is the records to insert in this case
				db.collection(collection)[command](options, {}, function(err, docs) {
				//db.collection('event').insert(options, {}, function(err, docs) {
				//db.createCollection(collection, function(err, data) {
					console.log('in db callback');
					if(err) {
						console.log('err = '+err);
						callback(err);
					}
				
					//console.log('data = ');
					//console.log(data);
					callback(null, docs);
					db.close();
				});
			}
			else {
				console.log('in old collection');
				db[command](collection, function(err, data) {
				//db.createCollection(collection, function(err, data) {
					console.log('in db callback');
					if(err) {
						console.log('err = '+err);
						callback(err);
					}
				
					//console.log('data = ');
					//console.log(data);
					callback(null, data);
					db.close();
				});
			}
			
			
		});
	},
	
	/**
	 * Gets all the collection names in mongo
	 *
	 * @param callback	- The callback to call with the collection names
	 */
	getCollectionNames: function(callback) {
		
		//console.log('in getCollectionNames');
		
		var collectionNames;
		var connectionString = 'mongodb://' + global.config.host + 
		':' + global.config.port + '/' + global.config.database;
		//console.log(connectionString);
		
		this.connection.connect(connectionString, function(err, db) {

			if(err) {
				console.log('err = '+err);
				callback(err);
			}

			db.collections(function(err, collections) {
				
				//console.log('result collections = ');
				//console.log(collections);
				
				if(err) {
					console.log('errrr = '+err);
					callback(err);
				}

				callback(null, collections);
				db.close();
			});
			
			
		});
	},
	
	/**
	 * Gets all the indexes for a specific collection
	 *
	 * @param collectionName	- The name of the collection to get the indexes for
	 * @param callback				- The callback to call with the collection names
	 */
	getIndexes: function(collectionName, callback) {
		
		var collectionNames;
		var connectionString = 'mongodb://' + global.config.host + 
		':' + global.config.port + '/' + global.config.database;
		//console.log(connectionString);
		
		this.connection.connect(connectionString, function(err, db) {

			if(err) {
				console.log('err = '+err);
				callback(err);
			}

			db.indexInformation(collectionName, function(err, indexInfo) {
				
				console.log('result indexInfo = ');
				console.log(indexInfo);
				
				if(err) {
					console.log('errrr = '+err);
					callback(err);
				}

				callback(null, indexInfo);
				db.close();
			});
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

  /*
  close: function(callback) {
      this.connection.end(callback);
    }*/
  

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
	//console.log(db);
  callback(null, new MongodbDriver(db));
};
