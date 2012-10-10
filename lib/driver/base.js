var util = require('util');
var events = require('events');
var type = require('../data_type');
var log = require('../log');
var Class = require('../class');

module.exports = Base = Class.extend({
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
        return 'VARCHAR';
      case type.TEXT:
        return 'TEXT';
      case type.INTEGER:
        return 'INTEGER';
      case type.DATE_TIME:
        return 'INTEGER';
      case type.REAL:
        return 'REAL';
      case type.BLOB:
        return 'BLOB';
      case type.TIMESTAMP:
        return 'TIMESTAMP';
      case type.BINARY:
        return 'BINARY';
      default:
        var unknownType = str.toUpperCase();
        log.warn('Using unknown data type', unknownType);
        return unknownType;
    }
  },

  createColumnDef: function(name, spec, options) {
    var type       = this.mapDataType(spec.type);
    var len        = spec.length ? util.format('(%s)', spec.length) : '';
    var constraint = this.createColumnConstraint(spec, options);
    return [name, type, len, constraint].join(' ');
  },

  createMigrationsTable: function(callback) {
    var options = {
      columns: {
        'id': { type: type.INTEGER, notNull: true, primaryKey: true, autoIncrement: true },
        'name': { type: type.STRING, length: 255, notNull: true},
        'run_on': { type: type.DATE_TIME, notNull: true}
      },
      ifNotExists: true
    };
    this.createTable('migrations', options, callback);
  },

  createTable: function(tableName, options, callback) {
    var columnSpecs = options;
    var tableOptions = {};

    if (options.columns !== undefined) {
      columnSpecs = options.columns;
      delete options.columns;
      tableOptions = options;
    }

    var ifNotExistsSql = "";
    if(tableOptions.ifNotExists) {
      ifNotExistsSql = "IF NOT EXISTS";
    }

    var primaryKeyColumns = [];
    var columnDefOptions = {
      emitPrimaryKey: false
    };

    for (var columnName in columnSpecs) {
      var columnSpec = this.normalizeColumnSpec(columnSpecs[columnName]);
      columnSpecs[columnName] = columnSpec;
      if (columnSpec.primaryKey) {
        primaryKeyColumns.push(columnName);
      }
    }

    var pkSql = '';
    if (primaryKeyColumns.length > 0) {
      pkSql = util.format(', PRIMARY KEY (%s)', primaryKeyColumns.join(', '));
    } else {
      columnDefOptions.emitPrimaryKey = true;
    }

    var columnDefs = [];
    for (var columnName in columnSpecs) {
      var columnSpec = columnSpecs[columnName];
      columnDefs.push(this.createColumnDef(columnName, columnSpec, columnDefOptions));
    }
    // Modified by @uid0 for production deployment bug.
    // ifNotExistsSQL doesn't appear to be set anywhere, but, we need this to be included
    // on any query that runs in production, otherwise it breaks things.  
    // old line:
    // var sql = util.format('CREATE TABLE %s %s (%s%s)', ifNotExistsSql, tableName, columnDefs.join(', '), pkSql);

    var sql = util.format('CREATE TABLE IF NOT EXISTS %s (%s%s)', tableName, columnDefs.join(', '), pkSql);

    console.log("[INFO] Query: " + sql);
    this.runSql(sql, callback);
  },

  dropTable: function(tableName, options, callback) {
    if (arguments.length < 3) {
      callback = options;
      options = {};
    }

    var ifExistsSql = '';
    if (options.ifExists) {
      ifExistsSql = 'IF EXISTS';
    }
    var sql = util.format('DROP TABLE %s %s', ifExistsSql, tableName);
    this.runSql(sql, callback);
  },

  renameTable: function(tableName, newTableName, callback) {
    throw new Error('not yet implemented');
  },

  addColumn: function(tableName, columnName, columnSpec, callback) {
    var def = this.createColumnDef(columnName, this.normalizeColumnSpec(columnSpec));
    var sql = util.format('ALTER TABLE %s ADD COLUMN %s', tableName, def);
    this.runSql(sql, callback);
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

  addIndex: function(tableName, indexName, columns, options, callback) {
    if (!Array.isArray(columns)) {
      columns = [columns];
    }
    var sql = util.format('CREATE %sINDEX %s ON %s (%s)', options.unique ? 'UNIQUE ' : '', indexName, tableName, columns.join(', '));
    this.runSql(sql, callback);
  },

  insert: function(tableName, columnNameArray, valueArray, callback) {
    if (columnNameArray.length !== valueArray.length) {
      return callback(new Error('The number of columns does not match the number of values.'));
    }

    var sql = util.format('INSERT INTO %s ', tableName);
    var columnNames = '(';
    var values = 'VALUES (';

    for (var index in columnNameArray) {
      columnNames += columnNameArray[index];

      if (typeof(valueArray[index]) === 'string') {
        values += "'" + valueArray[index] + "'";
      } else {
        values += valueArray[index];
      }

      if (index != columnNameArray.length - 1) {
       columnNames += ",";
       values +=  ",";
      }
    }

    sql += columnNames + ') '+ values + ');';
    this.runSql(sql, callback);
  },

  removeIndex: function(indexName, callback) {
    var sql = util.format('DROP INDEX %s', indexName);
    this.runSql(sql, callback);
  },

  normalizeColumnSpec: function(obj) {
    if (typeof(obj) === 'string') {
      return { type: obj };
    } else {
      return obj;
    }
  },

  startMigration: function(cb){cb()},
  endMigration: function(cb){cb()},
  // sql, params, callback
  // sql, callback
  runSql: function() {
    throw new Error('not yet implemented');
  },

  all: function(sql, params, callback) {
    throw new Error('not yet implemented');
  },

  escape: function(str) {
    return str.replace(/'/g, "\'");
  }
});
