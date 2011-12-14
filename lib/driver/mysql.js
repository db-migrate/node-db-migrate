var util = require('util');
var mysql = require('mysql');
var Base = require('./base');
var type = require('../data_type');

var MysqlDriver = Base.extend({
  init: function(connection) {
    this._super();
    this.connection = connection;
  },

  createColumnConstraint: function(spec) {
    var constraint = [];
    if (spec.primaryKey) {
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
      constraint.push(spec.defaultValue);
    }

    return constraint.join(' ');
  },

  renameTable: function(tableName, newTableName, callback) {
    var sql = util.format('RENAME TABLE %s TO %s', tableName, newTableName);
    this._runSql(sql, callback);
  },

  //removeColumn: function(tableName, columnName, callback) {
  //},

  //renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
  //};

  //changeColumn: function(tableName, columnName, columnSpec, callback) {
  //},

  _runSql: function() {
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
  var db = new mysql.createClient(config);
  callback(null, new MysqlDriver(db));
};
