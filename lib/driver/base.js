var util = require('util');
var events = require('events');
var type = require('../data_type');
var log = require('../log');
var Class = require('../class');
var Promise = require('bluebird');

var internals = {};

module.exports = Base = Class.extend({
  init: function(intern) {
    this._escapeDDL = this._escapeDDL || '"';
    this._escapeString = this._escapeString || '\'';
    internals = intern;
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
      case type.BIG_INTEGER:
        return 'BIGINT';
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
      case type.BOOLEAN:
        return 'BOOLEAN';
      case type.DECIMAL:
        return 'DECIMAL';
      case type.CHAR:
        return 'CHAR';
      case type.DATE:
        return 'DATE';
      case type.SMALLINT:
        return 'SMALLINT';
      default:
        var unknownType = str.toUpperCase();
        log.warn('Using unknown data type', unknownType);
        return unknownType;
    }
  },

  truncate: function(tableName, callback) {

    return this.runSql('TRUNCATE ' + this._escapeDDL  + tableName + this._escapeDDL).nodeify(callback);
  },

  checkDBMS: function(dbms, callback) {

    if( this.dbms === dbms )
      return Promise.resolve(dbms).nodeify(callback);
    else
      return Promise.reject('dbms does not match');
  },

  createDatabase: function() {

    throw new Error('not implemented');
  },

  switchDatabase: function() {
    throw new Error('not implemented');
  },

  dropDatabase: function() {
    throw new Error('not implemented');
  },

  recurseCallbackArray: function(foreignKeys, callback)
  {
    var self = this, fkFunc,
        promises = [];

    while((fkFunc = foreignKeys.pop()))
      promises.push(Promise.resolve(fkFunc()));

    return Promise.all(promises).nodeify(callback);
  },

  bindForeignKey: function(tableName, columnName, fkOptions) {
    var self = this,
        mapping = {};

    if(typeof(fkOptions.mapping) === 'string')
      mapping[columnName] = fkOptions.mapping;
    else
      mapping = fkOptions.mapping;

    return function (callback) {

      if (typeof(callback) === 'function')
        self.addForeignKey(tableName, fkOptions.table,
          fkOptions.name, mapping, fkOptions.rules, callback);
      else
        return self.addForeignKey(tableName, fkOptions.table,
          fkOptions.name, mapping, fkOptions.rules);

    };
  },

  createColumnDef: function(name, spec, options) {
    name = this._escapeDDL + name + this._escapeDDL;
    var type       = this.mapDataType(spec.type);
    var len        = spec.length ? util.format('(%s)', spec.length) : '';
    var constraint = this.createColumnConstraint(spec, options);

    return { foreignKey: null,
                 constraints: [name, type, len, constraint].join(' ') };
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
    this.createTable(internals.migrationTable, options, callback);
  },

  createSeedsTable: function(callback) {
    var options = {
      columns: {
        'id': { type: type.INTEGER, notNull: true, primaryKey: true, autoIncrement: true },
        'name': { type: type.STRING, length: 255, notNull: true},
        'run_on': { type: type.DATE_TIME, notNull: true}
      },
      ifNotExists: true
    };
    this.createTable(internals.seedTable, options, callback);
  },

  createTable: function(tableName, options, callback) {
    log.verbose('creating table:', tableName);
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
    if (primaryKeyColumns.length > 1) {
      pkSql = util.format(', PRIMARY KEY (%s)', this.quoteDDLArr(primaryKeyColumns).join(', '));
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

    var sql = util.format('CREATE TABLE %s "%s" (%s%s)', ifNotExistsSql, tableName, columnDefs.join(', '), pkSql);

    return this.runSql(sql)
    .then(function()
    {
        return this.recurseCallbackArray(foreignKeys);
    }.bind(this)).nodeify(callback);
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
    var sql = util.format('DROP TABLE %s "%s"', ifExistsSql, tableName);

    return this.runSql(sql).nodeify(callback);
  },

  renameTable: function(tableName, newTableName, callback) {
    throw new Error('not yet implemented');
  },

  addColumn: function(tableName, columnName, columnSpec, callback) {

    var def = this.createColumnDef(columnName, this.normalizeColumnSpec(columnSpec), {}, tableName);
    var sql = util.format('ALTER TABLE "%s" ADD COLUMN %s', tableName, def.constraints);

    return this.runSql(sql)
    .then(function()
    {
      if(def.foreignKey)
        return def.foreignKey();
      else
        return Promise.resolve();
    }).nodeify(callback);
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

  quoteDDLArr: function(arr) {

      for(var i = 0; i < arr.length; ++i)
        arr[i] = this._escapeDDL  + arr[i] + this._escapeDDL;

      return arr;
  },

  quoteArr: function(arr) {

      for(var i = 0; i < arr.length; ++i)
        arr[i] = this._escapeString  + arr[i] + this._escapeString;

      return arr;
  },

  addIndex: function(tableName, indexName, columns, unique, callback) {
    if (typeof(unique) === 'function') {
      callback = unique;
      unique = false;
    }

    if (!Array.isArray(columns)) {
      columns = [columns];
    }
    var sql = util.format('CREATE %s INDEX "%s" ON "%s" (%s)', (unique ? 'UNIQUE' : ''),
      indexName, tableName, this.quoteDDLArr(columns).join(', '));

    return this.runSql(sql).nodeify(callback);
  },

  insert: function(tableName, columnNameArray, valueArray, callback) {
    if (columnNameArray.length !== valueArray.length) {
      return callback(new Error('The number of columns does not match the number of values.'));
    }

    var sql = util.format('INSERT INTO ' + this._escapeDDL + '%s' + this._escapeDDL + ' ', tableName);
    var columnNames = '(';
    var values = 'VALUES (';

    for (var index in columnNameArray) {
      columnNames += columnNameArray[index];

      if (typeof(valueArray[index]) === 'string') {
        values += this._escapeString + this.escape(valueArray[index]) + this._escapeString;
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

  update: function(tableName, columnNameArray, valueArray, ids, callback) {

    if (columnNameArray.length !== valueArray.length) {
      return callback(new Error('The number of columns does not match the number of values.'));
    }

    var sql = util.format('UPDATE ' + this._escapeDDL + '%s' + this._escapeDDL + ' SET ', tableName );

    for (var index in columnNameArray) {
      sql += columnNameArray[index] + '=';

      if (typeof(valueArray[index]) === 'string') {
        sql += this._escapeString + this.escape(valueArray[index]) + this._escapeString;
      } else {
        sql += valueArray[index];
      }

      if (index != columnNameArray.length - 1) {
       sql += ", ";
      }
    }

    sql += ' ' + buildWhereClause(ids);
    return this.runSql(sql).nodeify(callback);
  },

  lookup: function(tableName, column, id, callback) {

    var sql = 'SELECT ' + this.escapeDDL(column) + ' FROM ' +
      this.escapeDDL(tableName) + ' ' + buildWhereClause(id);

    return this.runSql(sql)
    .then(function(row) {
      return row[0];
    });
  },

  removeIndex: function(tableName, indexName, callback) {
    if (arguments.length === 2 && typeof(indexName) === 'function') {
      callback = indexName;
      indexName = tableName;
    } else if (arguments.length === 1 && typeof(tableName) === 'string') {
      indexName = tableName;
    }

    var sql = util.format('DROP INDEX "%s"', indexName);
    return this.runSql(sql).nodeify(callback);
  },

  addForeignKey: function() {
    throw new Error('not implemented');
  },

  removeForeignKey: function() {
    throw new Error('not implemented');
  },

  normalizeColumnSpec: function(obj) {
    if (typeof(obj) === 'string') {
      return { type: obj };
    } else {
      return obj;
    }
  },

  addMigrationRecord: function (name, callback) {
    this.runSql('INSERT INTO "' + internals.migrationTable + '" (name, run_on) VALUES (?, ?)', [name, new Date()], callback);
  },

  addSeedRecord: function (name, callback) {
    this.runSql('INSERT INTO "' + internals.seedTable + '" (name, run_on) VALUES (?, ?)', [name, new Date()], callback);
  },

  startMigration: function(cb){ return Promise.resolve().nodeify(cb); },
  endMigration: function(cb){ return Promise.resolve().nodeify(cb); },
  // sql, params, callback
  // sql, callback
  runSql: function() {
    throw new Error('not implemented');
  },

  /**
    * Queries the migrations table
    *
    * @param callback
    */
  allLoadedMigrations: function(callback) {
    var sql = 'SELECT * FROM ' + this._escapeDDL + internals.migrationTable + this._escapeDDL + ' ORDER BY run_on DESC, name DESC';
    return this.all(sql, callback);
  },

  /**
    * Queries the seeds table
    *
    * @param callback
    */
  allLoadedSeeds: function(callback) {
    var sql = 'SELECT * FROM ' + this._escapeDDL + internals.seedTable + this._escapeDDL + ' ORDER BY run_on DESC, name DESC';
    return this.all(sql, callback);
  },

  /**
    * Deletes a migration
    *
    * @param migrationName   - The name of the migration to be deleted
    */
  deleteMigration: function(migrationName, callback) {
    var sql = 'DELETE FROM ' + this._escapeDDL + internals.migrationTable + this._escapeDDL + ' WHERE name = ?';
    this.runSql(sql, [migrationName], callback);
  },

  /**
    * Removes the specified keys from the database
    *
    * @param table - The table in which the to be deleted values are located
    * @param ids - array or object
    * id array  - arrayof the to be deleted ids
    * id object - { table: "name of the table to resolve the ids from",
    *               column: [
    *               {
    *                 name: "name of column", //defaults to id if unset
    *                 operator: ">", //defaults to = if unset
    *                 searchValue: "12",
    *                 searchValue: { table: "source", column: [...] },
    *                 //recursion with objects possible
    *                 link: "AND" //defaults to AND if unset
    *               }
    *               ]
    *             }
    *
    * @return Promise(runSql)
    */
  remove: function(table, ids, callback) {

    var sql = 'DELETE FROM ' + this._escapeDDL + table + + this._escapeDDL;
    var searchClause = '';

    return this.runSql(sql + buildWhereClause(ids)).nodeify(callback);
  },

  /**
    * Builds a where clause out of column objects.
    *
    * @param ids - array or object
    * id array  - arrayof the to be deleted ids
    * id object - { table: "name of the table to resolve the ids from",
    *               column: [
    *               {
    *                 name: "name of column", //defaults to id if unset
    *                 operator: ">", //defaults to = if unset
    *                 searchValue: "12",
    *                 searchValue: { table: "source", column: [...] },
    *                 //recursion with objects possible
    *                 link: "AND" //defaults to AND if unset
    *               }
    *               ]
    *             }
    *
    * @return string
    */
  buildWhereClause: function(ids) {

    var searchClause = '';

    if (util.isArray(ids) && typeof(ids[0]) !== 'object' && ids.length > 1) {

        searchClause += 'WHERE id IN (' + ids.join(this._escapeString + ',' + this._escapeString) + ')';
    }
    else if(typeof(ids) === 'string' || ids.length === 1) {
        var id = (util.isArray(ids)) ? ids[0] : ids;
        searchClause += 'WHERE id = ' + id;
    }
    else if (util.isArray(ids) && typeof(ids[0]) === 'object'){


        var preLink = ''
        searchClause = ' WHERE ';

        for (var column in ids) {
            column.name = column.name || 'id',
            column.operator = column.operator || '=',
            column.link = column.link || 'AND';

            if (!column.searchValue) {

                return Promise.reject('column ' + column.name + ' was entered without a searchValue.');
            }

            searchClause += ' ' + preLink + ' ' + this._escapeDDL  +
              column.name + this._escapeDDL + ' ' + column.operator;

            if (typeof(searchValue) === 'object' &&
                typeof(searchValue.table) === 'string' &&
                typeof(searchValue.columns) === 'object') {

                searchClause += ' (SELECT ' + this._escapeDDL + column.selector +
                    this._escapeDDL + ' FROM ' + this._escapeDDL +
                    column.searchValue.table + this._escapeDDL +
                    buildWhereClause(column.searchValue.column) + ')';
            }
            else {

              searchClause += ' (' + this._escapeString  + column.searchValue + this._escapeString + ')';
            }

            preLink = column.link;
        }
    }

    return searchClause;
  },


  /**
    * Deletes a seed
    *
    * @param seedName   - The name of the seed to be deleted
    */
  deleteSeed: function(seedName, callback) {
    var sql = 'DELETE FROM ' + this._escapeDDL + internals.seedTable + this._escapeDDL + ' WHERE name = ?';
    this.runSql(sql, [seedName], callback);
  },

  all: function(sql, params, callback) {
    throw new Error('not implemented');
  },

  escape: function(str) {
    if(this._escapeString === '\'')
      return str.replace(/'/g, "''");
    else
      return str.replace(/"/g, '"');
  },

  escapeString: function(str) {

    return this._escapeString + this.escape(str) + this._escapeString;
  },

  escapeDDL: function(str) {

    return this._escapeDDL + this.escape(str) + this._escapeDDL;
  }
});

Promise.promisifyAll(Base);
