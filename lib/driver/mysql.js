var util = require('util');
var moment = require('moment');
var mysql = require('mysql');
var Base = require('./base');
var type = require('../data_type');
var log = require('../log');

var MysqlDriver = Base.extend({
  init: function(connection) {
    this._super();
    this.connection = connection;
  },

  mapDataType: function(spec) {
    var len;
    switch(spec.type) {
      case type.TEXT:
        len = parseInt(spec.length, 10) || 1000;
        if(len > 16777216) {
          return 'LONGTEXT';
        }
        if(len > 65536) {
          return 'MEDIUMTEXT';
        }
        if(len > 256) {
          return 'TEXT';
        }
        return 'TINYTEXT';
      case type.DATE_TIME:
        return 'DATETIME';
      case type.BLOB:
        len = parseInt(spec.length, 10) || 1000;
        if(len > 16777216) {
          return 'LONGBLOB';
        }
        if(len > 65536) {
          return 'MEDIUMBLOB';
        }
        if(len > 256) {
          return 'BLOB';
        }
        return 'TINYBLOB';
      case type.BOOLEAN:
        return 'TINYINT(1)';
    }
    return this._super(spec.type);
  },

  createColumnDef: function(name, spec, options, tableName) {
    var escapedName = util.format('`%s`', name),
        t = this.mapDataType(spec),
        len;
    if(spec.type !== type.TEXT && spec.type !== type.BLOB) {
      len = spec.length ? util.format('(%s)', spec.length) : '';
      if (t === 'VARCHAR' && len === '') {
        len = '(255)';
      }
    }
    var constraint = this.createColumnConstraint(spec, options, tableName, name);
    return { foreignKey: constraint.foreignKey,
             constraints: [escapedName, t, len, constraint.constraints].join(' ') };
  },

  createColumnConstraint: function(spec, options, tableName, columnName) {
    var constraint = [];
    var cb;

    if (spec.unsigned) {
      constraint.push('UNSIGNED');
    }

    if (spec.primaryKey) {
      if (!options || options.emitPrimaryKey) {
        constraint.push('PRIMARY KEY');
      }
    }

    if(spec.primaryKey || spec.unique) {
      if (spec.autoIncrement) {
        constraint.push('AUTO_INCREMENT');
      }
    }

    if (spec.notNull === true) {
      constraint.push('NOT NULL');
    }

    if (spec.unique) {
      constraint.push('UNIQUE');
    }

    if (spec.null || spec.notNull === false) {
      constraint.push('NULL');
    }

    if (spec.defaultValue !== undefined) {
      constraint.push('DEFAULT');

      if (typeof spec.defaultValue === 'string'){
        constraint.push("'" + spec.defaultValue + "'");
      } else if (spec.defaultValue === null) {
        constraint.push('NULL');
      } else {
        constraint.push(spec.defaultValue);
      }
    }

    if (spec.foreignKey) {

      cb = this.bindForeignKey(tableName, columnName, spec.foreignKey);
    }

    return { foreignKey: cb, constraints: constraint.join(' ') };
  },

  createTable: function(tableName, options, callback) {
    log.verbose('creating table:', tableName);
    var columnSpecs = options,
        tableOptions = {};

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
    if (primaryKeyColumns.length > 1) {
      pkSql = util.format(', PRIMARY KEY (`%s`)', primaryKeyColumns.join('`, `'));
    } else {
      columnDefOptions.emitPrimaryKey = true;
    }

    var columnDefs = [];
    var foreignKeys = [];
    for (var columnName in columnSpecs) {
      var columnSpec = columnSpecs[columnName];
      var constraint = this.createColumnDef(columnName, columnSpec, columnDefOptions, tableName);

      columnDefs.push(constraint.constraints);
      if (constraint.foreignKey)
        foreignKeys.push(constraint.foreignKey);
    }

    var sql = util.format('CREATE TABLE %s `%s` (%s%s)', ifNotExistsSql, tableName, columnDefs.join(', '), pkSql);

    this.runSql(sql, function()
    {

        this.recurseCallbackArray(foreignKeys, callback);
    }.bind(this));
  },

  renameTable: function(tableName, newTableName, callback) {
    var sql = util.format('RENAME TABLE `%s` TO `%s`', tableName, newTableName);
    this.runSql(sql, callback);
  },

  addColumn: function(tableName, columnName, columnSpec, callback) {
    var def = this.createColumnDef(columnName, this.normalizeColumnSpec(columnSpec));
    var sql = util.format('ALTER TABLE `%s` ADD COLUMN %s', tableName, def.constraints);
    this.runSql(sql, function()
    {
      if(def.foreignKey)
        def.foreignKey(callback);
      else
        callback();
    });
  },

  createDatabase: function(dbName, options, callback) {

    var spec = '',
        ifNotExists = '';

    if(typeof(options) === 'function')
      callback = options;
    else
    {
      ifNotExists = (options.ifNotExists === true) ? 'IF NOT EXISTS' : '';
    }

    this.runSql(util.format('CREATE DATABASE %s `%s` %s', ifNotExists, dbName, spec), callback);
  },

  switchDatabase: function(options, callback) {

    if(typeof(options) === 'object')
    {
      if(typeof(options.database) === 'string')
        this.runSql(util.format('USE `%s`', options.database), callback);
    }
    else if(typeof(options) === 'string')
    {
      this.runSql(util.format('USE `%s`', options), callback);
    }
    else
      callback(null);
  },

  dropDatabase: function(dbName, options, callback) {

    var ifExists = '';

    if(typeof(options) === 'function')
      callback = options;
    else
    {
      ifExists = (options.ifExists === true) ? 'IF EXISTS' : '';
    }

    this.runSql(util.format('DROP DATABASE %s `%s`', ifExists, dbName), callback);
  },

  removeColumn: function(tableName, columnName, callback) {
    var sql = util.format('ALTER TABLE `%s` DROP COLUMN `%s`', tableName, columnName);
    this.runSql(sql, callback);
  },

  addIndex: function(tableName, indexName, columns, unique, callback) {
    if (typeof(unique) === 'function') {
      callback = unique;
      unique = false;
    }

    if (!Array.isArray(columns)) {
      columns = [columns];
    }
    var sql = util.format('ALTER TABLE `%s` ADD %s INDEX `%s` (`%s`)', tableName, (unique ? 'UNIQUE ' : ''), indexName, columns.join('`, `'));
    this.runSql(sql, callback);
  },

  insert: function(tableName, columnNameArray, valueArray, callback) {
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

    var sql = util.format('DROP INDEX `%s` ON `%s`', indexName, tableName);
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
    var sql = util.format('DROP TABLE %s `%s`', ifExistsSql, tableName);
    this.runSql(sql, callback);
  },

  renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
    var self = this, columnTypeSql = util.format("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '%s' AND COLUMN_NAME = '%s'", tableName, oldColumnName);

    this.all(columnTypeSql, function(err, result) {
      var columnType = result[0].COLUMN_TYPE;
      var alterSql = util.format("ALTER TABLE `%s` CHANGE `%s` `%s` %s", tableName, oldColumnName, newColumnName, columnType);
      self.runSql(alterSql, callback);
    });
  },

  changeColumn: function(tableName, columnName, columnSpec, callback) {
    var constraint = this.createColumnDef(columnName, columnSpec);
    var sql = util.format('ALTER TABLE `%s` CHANGE COLUMN `%s` %s', tableName, columnName, constraint.constraints);

    var exec = function() {

      this.runSql(sql, function()
      {
        if(constraint.foreignKey)
          constraint.foreignKey(callback);
        else
          callback();
      });
    }.bind(this);

    if(columnSpec.unique === false)
      this.removeIndex(tableName, columnName, exec);
    else
      exec();
  },

  addMigrationRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql('INSERT INTO `' + global.migrationTable + '` (`name`, `run_on`) VALUES (?, ?)', [name, formattedDate], callback);
  },

  addForeignKey: function(tableName, referencedTableName, keyName, fieldMapping, rules, callback) {
    if(arguments.length === 5 && typeof(rules) === 'function') {
      callback = rules;
      rules = {};
    }
    var columns = Object.keys(fieldMapping);
    var referencedColumns = columns.map(function (key) { return fieldMapping[key]; });
    var sql = util.format('ALTER TABLE `%s` ADD CONSTRAINT `%s` FOREIGN KEY (%s) REFERENCES `%s` (%s) ON DELETE %s ON UPDATE %s',
      tableName, keyName, this.tableQuoteArr( columns ), referencedTableName,
      this.tableQuoteArr( referencedColumns ), rules.onDelete || 'NO ACTION', rules.onUpdate || 'NO ACTION');
    this.runSql(sql, callback);
  },

  removeForeignKey: function(tableName, keyName, options, callback) {
    var sql = util.format('ALTER TABLE `%s` DROP FOREIGN KEY `%s`', tableName, keyName);
    this.runSql(sql, function () {

      if( typeof(options) === 'function' ) {

          options();
      }
      else if(options.dropIndex === true) {

        sql = util.format('ALTER TABLE `%s` DROP INDEX `%s`', tableName, keyName);
        this.runSql(sql, function () {
          callback();
        });
      }
      else
        callback();

    }.bind(this));
  },

  tableQuoteArr: function(arr) {

      for(var i = 0; i < arr.length; ++i)
        arr[i] = '`' + arr[i] + '`';

      return arr;
  },

  runSql: function() {

    var args = this._makeParamArgs(arguments);
    var callback = args[2];
    log.sql.apply(null, arguments);
    if(global.dryRun) {
      return callback();
    }

    return this.connection.query.apply(this.connection, args);
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
   * Queries the migrations table
   *
   * @param callback
   */
  allLoadedMigrations: function(callback) {
    var sql = 'SELECT * FROM `' + global.migrationTable + '` ORDER BY run_on DESC, name DESC';
    this.all(sql, callback);
  },

  /**
   * Deletes a migration
   *
   * @param migrationName		- The name of the migration to be deleted
   * @param callback
   */
  deleteMigration: function(migrationName, callback) {
    var sql = 'DELETE FROM `' + global.migrationTable + '` WHERE name = ?';
    this.runSql(sql, [migrationName], callback);
  },

  close: function(callback) {
    this.connection.end(callback);
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
