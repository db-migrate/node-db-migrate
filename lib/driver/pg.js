var util = require('util');
var pg = require('pg');
var semver = require('semver');
var Base = require('./base');
var type = require('../data_type');
var log = require('../log');
var Promise = require('bluebird');

var internals = {};

var PgDriver = Base.extend({
    init: function(connection, schema) {
        this._escapeString = '\'';
        this._super(internals);
        this.connection = connection;
        this.schema = schema || "public";
        this.connection.connect();
    },

    startMigration: function(cb){

      if(!internals.notransactions) {

        return Promise.promisify(this.runSql.bind(this))('BEGIN;').nodeify(cb);
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

    createColumnDef: function(name, spec, options, tableName) {
        var type = spec.autoIncrement ? '' : this.mapDataType(spec.type);
        var len = spec.length ? util.format('(%s)', spec.length) : '';
        var constraint = this.createColumnConstraint(spec, options, tableName, name);
        if (name.charAt(0) != '"') {
            name = '"' + name + '"';
        }

        return { foreignKey: constraint.foreignKey,
                 constraints: [name, type, len, constraint.constraints].join(' ') };
    },

    mapDataType: function(str) {
        switch(str) {
          case type.STRING:
            return 'VARCHAR';
          case type.DATE_TIME:
            return 'TIMESTAMP';
          case type.BLOB:
            return 'BYTEA';
        }
        return this._super(str);
    },

    createDatabase: function(dbName, options, callback) {

      var spec = '';

      if(typeof(options) === 'function')
        callback = options;

      this.runSql(util.format('CREATE DATABASE `%s` %s', dbName, spec), callback);
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

    createSequence: function(sqName, options, callback) {

      var spec = '',
          temp = '';

      if(typeof(options) === 'function')
        callback = options;
      else
      {
        temp = (options.temp === true) ? 'TEMP' : '';
      }

      this.runSql(util.format('CREATE %s SEQUENCE `%s` %s', temp, sqName, spec), callback);
    },

    switchDatabase: function(options, callback) {

      if(typeof(options) === 'object')
      {
        if(typeof(options.database) === 'string')
        {
          log.info('Ignore database option, not available with postgres. Use schema instead!');
          this.runSql(util.format('SET search_path TO `%s`', options.database), callback);
        }
      }
      else if(typeof(options) === 'string')
      {
        this.runSql(util.format('SET search_path TO `%s`', options), callback);
      }
      else
        callback(null);
    },

    dropSequence: function(dbName, options, callback) {

      var ifExists = '',
          rule = '';

      if(typeof(options) === 'function')
        callback = options;
      else
      {
        ifExists = (options.ifExists === true) ? 'IF EXISTS' : '';

        if(options.cascade === true)
          rule = 'CASCADE';
        else if(options.restrict === true)
          rule = 'RESTRICT';
      }

      this.runSql(util.format('DROP SEQUENCE %s `%s` %s', ifExists, dbName, rule), callback);
    },

    createMigrationsTable: function(callback) {
      var options = {
        columns: {
          'id': { type: type.INTEGER, notNull: true, primaryKey: true, autoIncrement: true },
          'name': { type: type.STRING, length: 255, notNull: true},
          'run_on': { type: type.DATE_TIME, notNull: true}
        },
        ifNotExists: false
      };

      return this.all('select version() as version')
      .then(function(result) {

        if (result && result && result.length > 0 && result[0].version) {
          var version = result[0].version;
          var match = version.match(/\d+\.\d+\.\d+/);
          if (match && match[0] && semver.gte(match[0], '9.1.0')) {
            options.ifNotExists = true;
          }
        }

        // Get the current search path so we can change the current schema
        // if necessary
        return this.all("SHOW search_path");
      }.bind(this))
      .then(function(result) {

          var searchPath,
              search_pathes = result[0].search_path.split(',');

          for (var i = 0; i < search_pathes.length; ++i) {
            if (search_pathes[i].indexOf('"') !== 0) {
              search_pathes[i] = '"' + search_pathes[i] + '"';
            }
          }

          result[0].search_path = search_pathes.join(',');

          // if the user specified a different schema, prepend it to the
          // search path. This will make all DDL/DML/SQL operate on the specified
          // schema.
          if (this.schema === 'public') {
              searchPath = result[0].search_path;
          } else {
              searchPath = '"' + this.schema + '",' + result[0].search_path;
          }

          return this.all('SET search_path TO ' + searchPath);
        }.bind(this))
        .then(function() {

            return this.all("SELECT table_name FROM information_schema.tables WHERE table_name = '" + internals.migrationTable + "'");
        }.bind(this))
        .then(function(result) {

          if (result && result && result.length < 1) {
            return this.createTable(internals.migrationTable, options);
          } else {
            return Promise.resolve();
          }
        }.bind(this)).nodeify(callback);
    },

    createSeedsTable: function(callback) {
      var options = {
        columns: {
          'id': { type: type.INTEGER, notNull: true, primaryKey: true, autoIncrement: true },
          'name': { type: type.STRING, length: 255, notNull: true},
          'run_on': { type: type.DATE_TIME, notNull: true}
        },
        ifNotExists: false
      };

      return this.all('select version() as version')
      .then(function(result) {

        if (result && result && result.length > 0 && result[0].version) {
          var version = result[0].version;
          var match = version.match(/\d+\.\d+\.\d+/);
          if (match && match[0] && semver.gte(match[0], '9.1.0')) {
            options.ifNotExists = true;
          }
        }

        // Get the current search path so we can change the current schema
        // if necessary
        return this.all("SHOW search_path");
      }.bind(this))
      .then(function(result) {

          var searchPath;

            // if the user specified a different schema, prepend it to the
            // search path. This will make all DDL/DML/SQL operate on the specified
            // schema.
            if (this.schema === 'public') {
                searchPath = result[0].search_path;
            } else {
                searchPath = '"' + this.schema + '",' + result[0].search_path;
            }

          return this.all('SET search_path TO ' + searchPath);
        }.bind(this))
        .then(function() {

            return this.all("SELECT table_name FROM information_schema.tables WHERE table_name = '" + internals.seedTable + "'");
        }.bind(this))
        .then(function(result) {

          if (result && result && result.length < 1) {
            return this.createTable(internals.seedTable, options);
          } else {
            return Promise.resolve();
          }
        }.bind(this)).nodeify(callback);
    },

    createColumnConstraint: function(spec, options, tableName, columnName) {
        var constraint = [],
            cb;

        if (spec.primaryKey && options.emitPrimaryKey) {
            if (spec.autoIncrement) {
                constraint.push('SERIAL');
            }
            constraint.push('PRIMARY KEY');
        }

        if (spec.notNull === true) {
            constraint.push('NOT NULL');
        }

        if (spec.unique) {
            constraint.push('UNIQUE');
        }

        if (typeof spec.defaultValue != 'undefined') {
            constraint.push('DEFAULT');
            if (typeof spec.defaultValue == 'string'){
                constraint.push("'" + spec.defaultValue + "'");
            } else {
              constraint.push(spec.defaultValue);
            }
        }

        if (spec.foreignKey) {

          cb = this.bindForeignKey(tableName, columnName, spec.foreignKey);
        }

        return { foreignKey: cb, constraints: constraint.join(' ') };
    },

    renameTable: function(tableName, newTableName, callback) {
        var sql = util.format('ALTER TABLE "%s" RENAME TO "%s"', tableName, newTableName);
        return this.runSql(sql).nodeify(callback);
    },

    removeColumn: function(tableName, columnName, callback) {
        var sql = util.format('ALTER TABLE "%s" DROP COLUMN "%s"', tableName, columnName);

        return this.runSql(sql).nodeify(callback);
    },

    renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
        var sql = util.format('ALTER TABLE "%s" RENAME COLUMN "%s" TO "%s"', tableName, oldColumnName, newColumnName);
        return this.runSql(sql).nodeify(callback);
    },

    changeColumn: function(tableName, columnName, columnSpec, callback) {
      return setNotNull.call(this);

      function setNotNull() {
        var setOrDrop = columnSpec.notNull === true ? 'SET' : 'DROP';
        var sql = util.format('ALTER TABLE "%s" ALTER COLUMN "%s" %s NOT NULL', tableName, columnName, setOrDrop);

        return this.runSql(sql).nodeify(setUnique.bind(this));
      }

      function setUnique(err) {
        if (err) {
          return Promise.reject(err);
        }

        var sql;
        var constraintName = tableName + '_' + columnName + '_key';

        if (columnSpec.unique === true) {
          sql = util.format('ALTER TABLE "%s" ADD CONSTRAINT "%s" UNIQUE ("%s")', tableName, constraintName, columnName);
          return this.runSql(sql).nodeify(setDefaultValue.bind(this));
        } else if (columnSpec.unique === false) {
          sql = util.format('ALTER TABLE "%s" DROP CONSTRAINT "%s"', tableName, constraintName);
          return this.runSql(sql).nodeify(setDefaultValue.bind(this));
        } else {
          return setDefaultValue.call(this);
        }
      }

      function setDefaultValue(err) {
        if (err) {
          return Promise.reject(err).nodeify(callback);
        }

        var sql;

        if (columnSpec.defaultValue !== undefined) {
          var defaultValue = null;
          if (typeof columnSpec.defaultValue == 'string'){
            defaultValue = "'" + columnSpec.defaultValue + "'";
          } else {
            defaultValue = columnSpec.defaultValue;
          }
          sql = util.format('ALTER TABLE "%s" ALTER COLUMN "%s" SET DEFAULT %s', tableName, columnName, defaultValue);
        } else {
          sql = util.format('ALTER TABLE "%s" ALTER COLUMN "%s" DROP DEFAULT', tableName, columnName);
        }
        return this.runSql(sql).then(
          setType.bind(this)
        ).nodeify(callback);
      }

      function setType() {
        if (columnSpec.type !== undefined){
          var using = columnSpec.using !== undefined ?
            columnSpec.using : util.format('USING "%s"::%s', columnName, this.mapDataType(columnSpec.type))
          var sql = util.format('ALTER TABLE "%s" ALTER COLUMN "%s" TYPE %s %s', tableName, columnName, this.mapDataType(columnSpec.type), using);
          return this.runSql(sql);
        }
      }
    },

    addForeignKey: function(tableName, referencedTableName, keyName, fieldMapping, rules, callback) {
      if(arguments.length === 5 && typeof(rules) === 'function') {
        callback = rules;
        rules = {};
      }
      var columns = Object.keys(fieldMapping);
      var referencedColumns = columns.map(function (key) { return '"' + fieldMapping[key] + '"'; });
      var sql = util.format('ALTER TABLE "%s" ADD CONSTRAINT "%s" FOREIGN KEY (%s) REFERENCES "%s" (%s) ON DELETE %s ON UPDATE %s',
        tableName, keyName, this.quoteDDLArr(columns), referencedTableName, referencedColumns, rules.onDelete || 'NO ACTION', rules.onUpdate || 'NO ACTION');
      return this.runSql(sql).nodeify(callback);
    },

    removeForeignKey: function(tableName, keyName, callback) {
      var sql = util.format('ALTER TABLE "%s" DROP CONSTRAINT "%s"', tableName, keyName);
      return this.runSql(sql).nodeify(callback);
    },

    insert: function(tableName, columnNameArray, valueArray, callback) {
      columnNameArray = columnNameArray.map(function(columnName) {
        return (columnName.charAt(0) != '"') ? '"' + columnName + '"' : columnName;
      });

      valueArray = valueArray.map(function(value) {
        return 'string' === typeof value ? value : JSON.stringify(value);
      });

      return this._super(tableName, columnNameArray, valueArray, callback);
    },

    runSql: function() {
        var callback,
            minLength = 1;

        if(typeof(arguments[arguments.length - 1]) === 'function')
        {
          minLength = 2;
          callback = arguments[arguments.length - 1];
        }

        params = arguments;
        if (params.length > minLength){
            // We have parameters, but db-migrate uses "?" for param substitutions.
            // PG uses "$1", "$2", etc so fix up the "?" into "$1", etc
            var param = params[0].split('?'),
                new_param = [];
            for (var i = 0; i < param.length-1; i++){
                new_param.push(param[i], "$" + (i+1));
            }
            new_param.push(param[param.length-1]);
            params[0] = new_param.join('');
        }

        log.sql.apply(null, params);
        if(internals.dryRun) {
          return Promise.resolve().nodeify(callback);
        }

        return new Promise(function(resolve, reject) {
          var prCB = function(err, data) {
            return (err ? reject(err) : resolve(data));
          };

          if( minLength === 2 )
            params[params.length - 1] = prCB;
          else
            params[params.length++] = prCB;

          this.connection.query.apply(this.connection, params);
        }.bind(this)).nodeify(callback);
    },

    all: function() {
        params = arguments;

        log.sql.apply(null, params);

        return new Promise(function(resolve, reject) {
          var prCB = function(err, data) {
            return (err ? reject(err) : resolve(data));
          };

          this.connection.query.apply(this.connection, [params[0], function(err, result){
            prCB(err, result.rows);
          }]);

        }.bind(this)).nodeify(params[1]);
    },

    close: function(callback) {
        this.connection.end();
        return Promise.resolve().nodeify(callback);
    }

});

Promise.promisifyAll(PgDriver);

exports.connect = function(config, intern, callback) {

    internals = intern;

    if (config.native) { pg = pg.native; }
    var db = config.db || new pg.Client(config);
    callback(null, new PgDriver(db, config.schema));
};
