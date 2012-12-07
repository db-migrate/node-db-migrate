var util = require('util');
var moment = require('moment');
var mysql = require('mysql');
var Base = require('./base');
var type = require('../data_type');

var MysqlDriver = Base.extend({
  init: function(connection) {
    this._super();
    this.connection = connection;
  },

  mapDataType: function(str) {
    switch(str) {
      case type.STRING:
        return 'VARCHAR';
      case type.TEXT:
        return 'TEXT';
      case type.INTEGER:
        return 'INTEGER';
      case type.DATE_TIME:
        return 'DATETIME';
      case type.REAL:
        return 'REAL';
      case type.BLOB:
        return 'BLOB';
      case type.TIMESTAMP:
        return 'TIMESTAMP';
      case type.BINARY:
        return 'BINARY';
      default:
        throw new Error('Invalid data type ' + str);
    }
  },

  createColumnDef: function(name, spec, options) {
    var type = this.mapDataType(spec.type);
    var len = spec.length ? util.format('(%s)', spec.length) : '';
    if (type === 'VARCHAR' && len === '') {
      len = '(255)';
    }
    var constraint = this.createColumnConstraint(spec, options);
    return [name, type, len, constraint].join(' ');
  },

  createColumnConstraint: function(spec, options) {
    var constraint = [];
    if (spec.unsigned) {
      constraint.push('UNSIGNED');
    }

    if (spec.primaryKey && options.emitPrimaryKey) {
      constraint.push('PRIMARY KEY');
      if (spec.autoIncrement) {
        constraint.push('AUTO_INCREMENT');
      }
    }

    if (spec.notNull) {
      constraint.push('NOT NULL');
    }

    if (spec.unique) {
      constraint.push('UNIQUE');
    }

    if (spec.null) {
      constraint.push('NULL');
    }

    if (spec.defaultValue) {
      constraint.push('DEFAULT');

      if (typeof spec.defaultValue === 'string'){
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
    // tableName is optional for other drivers, but required for mySql. So, check the args to ensure they are valid
    if (arguments.length === 2 && typeof(indexName) === 'function') {
      callback = indexName;
      process.nextTick(function () {
        callback(new Error('Illegal arguments, must provide "tableName" and "indexName"'));
      });

      return;
    }

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

  addMigrationRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql('INSERT INTO migrations (name, run_on) VALUES (?, ?)', [name, formattedDate], callback);
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
  var db;
  if (typeof(mysql.createConnection) === 'undefined') {
    db = config.db || new mysql.createClient(config);
  } else {
    db = config.db || new mysql.createConnection(config);
  }
  callback(null, new MysqlDriver(db));
};
