var util = require('util');
var sqlite3 = require('sqlite3').verbose();
var Base = require('./base');
var log = require('../log');
var type = require('../data_type');
var Promise = require('bluebird');

var defaultMode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    internals = {};

var Sqlite3Driver = Base.extend({
  init: function(connection) {
    this._escapeString = '"';
    this._super(internals);
    this.connection = connection;
  },

  startMigration: function(cb){

    if(!internals.notransactions) {

      return Promise.promisify(this.runSql.bind(this))('BEGIN TRANSACTION;').nodeify(cb);
    }
    else
      return Promise.resolve().nodeify(cb);
  },

  endMigration: function(cb){

    if(!internals.notransactions) {

      return Promise.promisify(this.runSql.bind(this))('COMMIT;').nodeify(cb);
    }
    else
      return Promise.resolve(null).nodeify(cb);
  },

  mapDataType: function(str) {
    switch(str) {
      case type.DATE_TIME:
        return 'datetime';
      case type.TIME:
        return 'time';
    }
    return this._super(str);
  },

  switchDatabase: function(options, callback) {
    callback(null);
  },

  createColumnDef: function(name, spec, options) {
    name = '"' + name + '"';
    var dType       = this.mapDataType(spec.type);
    var len        = spec.length ? util.format('(%s)', spec.length) : '';
    var constraint = this.createColumnConstraint(spec, options);

    if(spec.type === type.INTEGER)
      len = '';

    return { foreignKey: null,
                 constraints: [name, dType, len, constraint].join(' ') };
  },

  createColumnConstraint: function(spec, options) {
    var constraint = [];
    if (spec.primaryKey && options.emitPrimaryKey) {
      constraint.push('PRIMARY KEY');
      if (spec.autoIncrement) {
        constraint.push('AUTOINCREMENT');
      }
    }

    if (spec.notNull === true) {
      constraint.push('NOT NULL');
    }

    if (spec.unique) {
      constraint.push('UNIQUE');
    }

    if (spec.defaultValue) {
      constraint.push('DEFAULT');

      if(typeof(spec.defaultValue) === 'string')
        constraint.push('"' + spec.defaultValue + '"');
      else
        constraint.push(spec.defaultValue);
    }

    return constraint.join(' ');
  },

  renameTable: function(tableName, newTableName, callback) {
    var sql = util.format('ALTER TABLE %s RENAME TO %s', tableName, newTableName);

    return this.runSql(sql).nodeify(callback);
  },

  //removeColumn: function(tableName, columnName, callback) {
  //},

  //renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
  //};

  //changeColumn: function(tableName, columnName, columnSpec, callback) {
  //},

  runSql: function() {
    var callback = arguments[arguments.length - 1];
    var params = arguments;

    log.sql.apply(null, arguments);
    if(internals.dryRun) {
      return Promise.resolve().nodeify(callback);
    }

    return new Promise(function(resolve, reject) {
      var prCB = function(err, data) {
        return (err ? reject(err) : resolve(data));
      };

      if( typeof(params[params.length - 1]) === 'function' )
        params[params.length - 1] = prCB;
      else
        params[params.length++] = prCB;


      if(params.length === 1 || (callback && typeof(params[1]) === 'function'))
        this.connection.exec.apply(this.connection, params);
      else
        this.connection.run.apply(this.connection, params);
    }.bind(this)).nodeify(callback);
  },

  all: function() {

    log.sql.apply(null, arguments);

    this.connection.all.apply(this.connection, arguments);
  },

  close: function(callback) {
    this.connection.close();

    if(typeof(callback) === 'function')
      callback(null);
    else
      return Promise.resolve();
  }

});

Promise.promisifyAll(Sqlite3Driver);

exports.connect = function(config, intern, callback) {
  var mode = config.mode || defaultMode;

  internals = intern;

  if (config.db) {
    callback(null, new Sqlite3Driver(config.db));
  } else {
    if (typeof(config.filename) === 'undefined') {
      console.error('filename is required in database.json');
      return;
    }
    var db = new sqlite3.Database(config.filename, mode);
    db.on("error", callback);
    db.on("open", function() {
      callback(null, new Sqlite3Driver(db));
    });
  }
};
