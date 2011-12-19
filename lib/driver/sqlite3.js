var util = require('util');
var sqlite3 = require('sqlite3').verbose();
var Base = require('./base');
var type = require('../data_type');

var defaultMode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

var Sqlite3Driver = Base.extend({
  init: function(connection) {
    this._super();
    this.connection = connection;
  },

  createColumnConstraint: function(spec, options) {
    var constraint = [];
    if (spec.primaryKey && options.emitPrimaryKey) {
      constraint.push('PRIMARY KEY');
      if (spec.autoIncrement) {
        constraint.push('AUTOINCREMENT');
      }
    }

    if (spec.notNull) {
      constraint.push('NOT NULL');
    }

    if (spec.unique) {
      constraint.push('UNIQUE');
    }

    if (spec.defaultValue) {
      constraint.push('DEFAULT');
      constraint.push(spec.defaultValue);
    }

    return constraint.join(' ');
  },

  renameTable: function(tableName, newTableName, callback) {
    var sql = util.format('ALTER TABLE %s RENAME TO %s', tableName, newTableName);
    this.runSql(sql, callback);
  },

  //removeColumn: function(tableName, columnName, callback) {
  //},

  //renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
  //};

  //changeColumn: function(tableName, columnName, columnSpec, callback) {
  //},

  runSql: function() {
    this.connection.run.apply(this.connection, arguments);
  },

  all: function() {
    this.connection.all.apply(this.connection, arguments);
  },

  close: function() {
    this.connection.close();
  }

});

exports.connect = function(config, callback) {
  var mode = config.mode || defaultMode;
  if (config.db) {
    callback(null, new Sqlite3Driver(config.db));
  } else {
    var db = new sqlite3.Database(config.filename, mode);
    db.on("error", callback);
    db.on("open", function() {
      callback(null, new Sqlite3Driver(db));
    });
  }
};
