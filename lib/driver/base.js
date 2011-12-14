var util = require('util');
var events = require('events');
var type = require('../data_type');
var myUtil = require('../util');

module.exports = Base = myUtil.Class.extend({
  init: function() {
    this.eventEmmiter = new events.EventEmitter();
    for(var n in events.EventEmitter.prototype) {
      this[n] = events.EventEmitter.prototype[n];
    }
  },

  close: function() {
    throw new Error('not yet implemented');
  },

  mapDataType: function(str) {
    switch(str) {
      case type.STRING:
        return 'TEXT';
      case type.TEXT:
        return 'TEXT';
      case type.INTEGER:
        return 'INTEGER';
      case type.DATE_TIME:
        return 'INTEGER';
      case type.REAL:
        return 'REAL';
      default:
        throw new Error('Invalid data type ' + str);
    }
  },

  createColumnDef: function(name, spec) {
    return [name, this.mapDataType(spec.type), this.createColumnConstraint(spec)].join(' ');
  },

  createMigrationsTable: function(callback) {
    var columnSpecs = {
      'id': { type: type.INTEGER, notNull: true, primaryKey: true, autoIncrement: true },
      'name': { type: type.STRING, length: 255, notNull: true},
      'run_on': { type: type.DATE_TIME, notNull: true}
    };
    this._createTable('migrations', columnSpecs, { ifNotExists: true }, callback);
  },

  createTable: function(tableName, columnSpecs, tableOptions, callback) {
    this._createTable.apply(this, arguments);
  },

  _createTable: function(tableName, columnSpecs, tableOptions, callback) {
    if(typeof(arguments[arguments.length-1]) == "function") {
      callback = arguments[arguments.length - 1];
    } else {
      callback = function(err) { if(err) { console.error(err); } };
    }

    tableOptions = tableOptions || {};

    var ifNotExistsSql = "";
    if(tableOptions.ifNotExists) {
      ifNotExistsSql = "IF NOT EXISTS";
    }

    var columnDefs = [];
    for (var columnName in columnSpecs) {
      columnDefs.push(this.createColumnDef(columnName, this.normalizeColumnSpec(columnSpecs[columnName])));
    }
    var sql = util.format('CREATE TABLE %s %s (%s)', ifNotExistsSql, tableName, columnDefs.join(', '));
    this._runSql(sql, callback);
  },

  dropTable: function(tableName, callback) {
    var sql = util.format('DROP TABLE %s', tableName);
    this._runSql(sql, callback);
  },

  renameTable: function(tableName, newTableName, callback) {
    throw new Error('not yet implemented');
  },

  createColumnDef: function(tableName, newTableName, callback) {
    throw new Error('not yet implemented');
  },

  addColumn: function(tableName, columnName, columnSpec, callback) {
    var def = this.createColumnDef(columnName, this.normalizeColumnSpec(columnSpec));
    var sql = util.format('ALTER TABLE %s ADD COLUMN %s', tableName, def);
    this._runSql(sql, callback);
  },

  removeColumn: function(tableName, columnName, callback) {
    throw new Error('not yet implemented');
  },

  renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
    throw new Error('not yet implemented');
  },

  changeColumn: function(tableName, columnName, columnSpec, callback) {
    throw new Error('not yet implemented');
  },

  addIndex: function(tableName, indexName, columns, callback) {
    if (!Array.isArray(columns)) {
      columns = [columns];
    }
    var sql = util.format('CREATE INDEX %s ON %s (%s)', indexName, tableName, columns.join(', '));
    this._runSql(sql, callback);
  },

  removeIndex: function(indexName, callback) {
    var sql = util.format('DROP INDEX %s', indexName);
    this._runSql(sql, callback);
  },

  normalizeColumnSpec: function(obj) {
    if (typeof(obj) === 'string') {
      return { type: obj };
    } else {
      return obj;
    }
  },

  // the difference between runSql and _runSql is that when running a migration runSql gets reference counted and
  // _runSql does not.
  //
  // Arguments:
  //   sql, params, callback
  //   sql, callback
  runSql: function() {
    this._runSql.apply(this, arguments);
  },

  // sql, params, callback
  // sql, callback
  _runSql: function() {
    throw new Error('not yet implemented');
  },

  all: function(sql, params, callback) {
    throw new Error('not yet implemented');
  },

  skip: function(callback) {
    callback();
  },

  escape: function(str) {
    return str.replace(/'/g, "\'");
  }
});
