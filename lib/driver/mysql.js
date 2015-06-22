var util = require('util');
var moment = require('moment');
var mysql = require('mysql');
var Base = require('./base');
var type = require('../data_type');
var log = require('../log');
var Promise = require('bluebird');

var internals = {};

var MysqlDriver = Base.extend({
  init: function(connection) {
    this._escapeDDL = '`';
    this._escapeString = '\'';
    this._super(internals);
    this.connection = connection;
  },

  startMigration: function(cb){

    var self = this;

    if(!internals.notansactions) {

      return this.runSql('SET AUTOCOMMIT=0;')
             .then(function() {
                return self.runSql('START TRANSACTION;');
            })
             .nodeify(cb);
    }
    else
      return Promise.resolve().nodeify(cb);
  },

  endMigration: function(cb){

    if(!internals.notransactions) {

      return this.runSql('COMMIT;').nodeify(cb);
    }
    else
      return Promise.resolve(null).nodeify(cb);
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

    if (spec.engine && typeof(spec.engine) === 'string') {
      constraint.push('ENGINE=\'' + spec.engine + '\'')
    }

    if (spec.rowFormat && typeof(spec.rowFormat) === 'string') {
      constraint.push('ROW_FORMAT=\'' + spec.rowFormat + '\'')
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

    return this.runSql(sql)
    .then(function()
    {

        return this.recurseCallbackArray(foreignKeys);
    }.bind(this)).nodeify(callback);
  },

  renameTable: function(tableName, newTableName, callback) {
    var sql = util.format('RENAME TABLE `%s` TO `%s`', tableName, newTableName);
    return this.runSql(sql).nodeify(callback);
  },

  addColumn: function(tableName, columnName, columnSpec, callback) {
    var def = this.createColumnDef(columnName, this.normalizeColumnSpec(columnSpec), {}, tableName);
    var sql = util.format('ALTER TABLE `%s` ADD COLUMN %s', tableName, def.constraints);
    this.runSql(sql)
    .then(function()
    {
      if(def.foreignKey)
        return def.foreignKey();
      else
        return Promise.resolve();
    }).nodeify(callback);
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

    return this.runSql(sql).nodeify(callback);
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
    return this.runSql(sql).nodeify(callback);
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
    return this.runSql(sql).nodeify(callback);
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

    return this.runSql(sql).nodeify(callback);
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

    return this.runSql(sql).nodeify(callback);
  },

  renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
    var self = this, columnTypeSql = util.format("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '%s' AND COLUMN_NAME = '%s'", tableName, oldColumnName);

    return this.runSql(columnTypeSql)
    .then(function(result) {
      var columnType = result[0].COLUMN_TYPE;
      var alterSql = util.format("ALTER TABLE `%s` CHANGE `%s` `%s` %s", tableName, oldColumnName, newColumnName, columnType);

      return self.runSql(alterSql);
    }).nodeify(callback);
  },

  changeColumn: function(tableName, columnName, columnSpec, callback) {
    var constraint = this.createColumnDef(columnName, columnSpec);
    var sql = util.format('ALTER TABLE `%s` CHANGE COLUMN `%s` %s', tableName, columnName, constraint.constraints);

    var exec = function() {

      return this.runSql(sql)
      .then(function()
      {
        if(constraint.foreignKey)
          return constraint.foreignKey();
        else
          return Promise.resolve();
      }).nodeify(callback);
    }.bind(this);

    if(columnSpec.unique === false)
      return this.removeIndex(tableName, columnName)
      .then(exec);
    else
      return exec();
  },

  addMigrationRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql('INSERT INTO `' + internals.migrationTable + '` (`name`, `run_on`) VALUES (?, ?)', [name, formattedDate], callback);
  },

  addSeedRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql('INSERT INTO `' + internals.seedTable + '` (`name`, `run_on`) VALUES (?, ?)', [name, formattedDate], callback);
  },

  addForeignKey: function(tableName, referencedTableName, keyName, fieldMapping, rules, callback) {
    if(arguments.length === 5 && typeof(rules) === 'function') {
      callback = rules;
      rules = {};
    }
    var columns = Object.keys(fieldMapping);
    var referencedColumns = columns.map(function (key) { return fieldMapping[key]; });
    var sql = util.format('ALTER TABLE `%s` ADD CONSTRAINT `%s` FOREIGN KEY (%s) REFERENCES `%s` (%s) ON DELETE %s ON UPDATE %s',
      tableName, keyName, this.quoteDDLArr( columns ), referencedTableName,
      this.quoteDDLArr( referencedColumns ), rules.onDelete || 'NO ACTION', rules.onUpdate || 'NO ACTION');

    return this.runSql(sql).nodeify(callback);
  },

  removeForeignKey: function(tableName, keyName, options, callback) {
    var sql = util.format('ALTER TABLE `%s` DROP FOREIGN KEY `%s`', tableName, keyName);

    return this.runSql(sql)
    .then(function () {

      if( typeof(options) === 'function' ) {

          return Promise.resolve().nodeify(options);
      }
      else if(options.dropIndex === true) {

        sql = util.format('ALTER TABLE `%s` DROP INDEX `%s`', tableName, keyName);
        return this.runSql(sql);
      }
      else
        return Promise.resolve().nodeify(callback);

    }.bind(this)).nodeify(callback);
  },

  runSql: function() {

    var self = this;
    var args = this._makeParamArgs(arguments);

    var callback = args.pop();
    log.sql.apply(null, arguments);
    if(internals.dryRun) {
      return Promise.resolve().nodeify(callback);
    }

    return new Promise(function(resolve, reject) {
      args.push(function(err, data) {
        return (err ? reject(err) : resolve(data));
      });

      self.connection.query.apply(self.connection, args);
    }).nodeify(callback);
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

    log.sql.apply(null, arguments);

    return this.connection.query.apply(this.connection, args);
  },

  close: function(callback) {
    return new Promise(function(resolve, reject) {
      var cb = (function(err, data) {
        return (err ? reject(err) : resolve(data));
      });

      this.connection.end(cb);
    }.bind(this)).nodeify(callback);
  }

});

Promise.promisifyAll(MysqlDriver);

exports.connect = function(config, intern, callback) {
  var db;

  internals = intern;

  if (typeof(mysql.createConnection) === 'undefined') {
    db = config.db || new mysql.createClient(config);
  } else {
    db = config.db || new mysql.createConnection(config);
  }
  callback(null, new MysqlDriver(db));
};
