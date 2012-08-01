var util = require('util');
var mysql = require('mysql');
var Base = require('./base');
var type = require('../data_type');

var MysqlDriver = Base.extend({
  init: function(connection) {
    this._super();
    this.connection = connection;
  },

  createColumnConstraint: function(spec, options) {
    var constraint = [];
    if (spec.primaryKey && options.emitPrimaryKey) {
      constraint.push('PRIMARY KEY');
      if (spec.autoIncrement) {
        constraint.push('auto_increment');
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

      if (typeof spec.defaultValue == 'string'){
        constraint.push("'" + spec.defaultValue + "'");
      } else {
        constraint.push(spec.defaultValue);
      }
    }

    return constraint.join(' ');
  },

  renameTable: function(tableName, newTableName, callback) {
    var sql = util.format('RENAME TABLE %s TO %s', tableName, newTableName);
    this.runSql(sql, callback);
  },

  removeColumn: function(tableName, columnName, callback) {
    var sql = util.format('ALTER TABLE %s DROP COLUMN %s', tableName, columnName);
    this.runSql(sql, callback);
  },

  removeIndex: function(tableName, indexName, callback) {
    var sql = util.format('DROP INDEX %s ON %s', indexName, tableName);
    this.runSql(sql, callback);
  },
//  renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
//  },

  changeColumn: function(tableName, columnName, columnSpec, callback) {
    var constraint = this.createColumnDef(columnName, columnSpec);
    var sql = util.format('ALTER TABLE %s CHANGE COLUMN %s %s', tableName, columnName, constraint);
    this.runSql(sql, callback);
  },

  runSql: function() {
    this.connection.query.apply(this.connection, arguments);
  },

  all: function() {
    this.connection.query.apply(this.connection, arguments);
  },

  close: function() {
    this.connection.end();
  }

});

exports.connect = function(config, callback) {
  var db = config.db || new mysql.createClient(config);
  callback(null, new MysqlDriver(db));
};
