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
	 * Adds an index to a collection
	 */
  addIndex: function(collectionName, indexName, columns, unique, callback) {
    if (typeof(unique) === 'function') {
      callback = unique;
      unique = false;
    }
				
		var options = {
			indexName: indexName, 
			columns: columns, 
			unique: unique
		};
		
		this._run('createIndex', collectionName, options, callback);
  },


  insert: function(collectionName, toInsert, callback) {
		
   /*
    if (columnNameArray.length !== valueArray.length) {
         return callback(new Error('The number of columns does not match the number of values.'));
       }
   
       var sql = util.format('INSERT INTO `%s` ', tableName);
       var columnNames = '(';
       var values = 'VALUES (';
   
       for (var index in columnNameArray) {
         columnNames += '`' + columnNameArray[index] + '`';
   
         if (typeof(valueArray[index]) === 'string') {
           values += "'" + this.escape(valueArray[index]) + "'";
         } else {
           values += valueArray[index];
         }
   
         if (index != columnNameArray.length - 1) {
           columnNames += ",";
           values +=  ",";
         }
       }
   
       sql += columnNames + ') '+ values + ');';
       this.runSql(sql, callback);*/
   
		
		
		this._run('insert', collectionName, toInsert, callback);
  },

  /*
  removeIndex: function(tableName, indexName, callback) {
      // tableName is optional for other drivers, but required for mySql. So, check the args to ensure they are valid
      if (arguments.length === 2 && typeof(indexName) === 'function') {
        callback = indexName;
        process.nextTick(function () {
          callback(new Error('Illegal arguments, must provide "tableName" and "indexName"'));
        });
  
        return;
      }
  
      var sql = util.format('DROP INDEX `%s` ON `%s`', indexName, tableName);
      this.runSql(sql, callback);
    },*/
  

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
			
			if(command === 'find') {
				console.log('in find');
				// options is the query in this case
				db.collection[command](options).toArray(function(err, docs) {
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
