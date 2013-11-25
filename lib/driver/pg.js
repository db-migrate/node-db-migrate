var util = require('util');
var pg = require('pg');
var semver = require('semver');
var Base = require('./base');
var type = require('../data_type');
var log = require('../log');

var PgDriver = Base.extend({
    init: function(connection) {
        this._super();
        this.connection = connection;
        this.connection.connect();
    },

    startMigration: function(cb){
        this.runSql('BEGIN;', function() { cb();});
    },

    endMigration: function(cb){
        this.runSql('COMMIT;', function(){cb(null);});
    },

    createColumnDef: function(name, spec, options) {
        var type = spec.autoIncrement ? '' : this.mapDataType(spec.type);
        var len = spec.length ? util.format('(%s)', spec.length) : '';
        var constraint = this.createColumnConstraint(spec, options);
        if (name.charAt(0) != '"') {
            name = '"' + name + '"';
        }
        return [name, type, len, constraint].join(' ');
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

    createMigrationsTable: function(callback) {
      var options = {
        columns: {
          'id': { type: type.INTEGER, notNull: true, primaryKey: true, autoIncrement: true },
          'name': { type: type.STRING, length: 255, notNull: true},
          'run_on': { type: type.DATE_TIME, notNull: true}
        },
        ifNotExists: false
      };

      this.runSql('select version() as version', function(err, result) {
        if (err) {
          return callback(err);
        }

        if (result && result.rows && result.rows.length > 0 && result.rows[0].version) {
          var version = result.rows[0].version;
          var match = version.match(/\d+\.\d+\.\d+/);
          if (match && match[0] && semver.gte(match[0], '9.1.0')) {
            options.ifNotExists = true;
          }
        }

        this.runSql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations'", function(err, result) {
          if (err) {
            return callback(err);
          }

          if (result && result.rows && result.rows.length < 1) {
            this.createTable('migrations', options, callback);
          } else {
            callback();
          }
        }.bind(this));
      }.bind(this));
    },

    createColumnConstraint: function(spec, options) {
        var constraint = [];
        if (spec.primaryKey && options.emitPrimaryKey) {
            if (spec.autoIncrement) {
                constraint.push('SERIAL');
            }
            constraint.push('PRIMARY KEY');
        }

        if (spec.notNull) {
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

        return constraint.join(' ');
    },

    renameTable: function(tableName, newTableName, callback) {
        var sql = util.format('ALTER TABLE %s RENAME TO %s', tableName, newTableName);
        this.runSql(sql, callback);
    },

    removeColumn: function(tableName, columnName, callback) {
        var sql = util.format("ALTER TABLE %s DROP COLUMN %s", tableName, columnName);
        this.runSql(sql, callback);
    },

    renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
        var sql = util.format("ALTER TABLE %s RENAME COLUMN %s TO %s", tableName, oldColumnName, newColumnName);
        this.runSql(sql, callback);
    },

    changeColumn: function(tableName, columnName, columnSpec, callback) {
      setNotNull.call(this);

      function setNotNull() {
        var setOrDrop = columnSpec.notNull === true ? 'SET' : 'DROP';
        var sql = util.format("ALTER TABLE %s ALTER COLUMN %s %s NOT NULL", tableName, columnName, setOrDrop);
        this.runSql(sql, setUnique.bind(this));
      }

      function setUnique(err) {
        if (err) {
          callback(err);
        }

        var sql;
        var constraintName = tableName + '_' + columnName + '_unique';

        if (columnSpec.unique === true) {
          sql = util.format("ALTER TABLE %s ADD CONSTRAINT %s UNIQUE (%s)", tableName, constraintName, columnName);
          this.runSql(sql, setDefaultValue.bind(this));
        } else if (columnSpec.unique === false) {
          sql = util.format("ALTER TABLE %s DROP CONSTRAINT %s", tableName, constraintName);
          this.runSql(sql, setDefaultValue.bind(this));
        } else {
          setDefaultValue.call(this);
        }
      }

      function setDefaultValue(err) {
        if (err) {
          return callback(err);
        }

        var sql;

        if (columnSpec.defaultValue !== undefined) {
          var defaultValue = null;
          if (typeof columnSpec.defaultValue == 'string'){
            defaultValue = "'" + columnSpec.defaultValue + "'";
          } else {
            defaultValue = columnSpec.defaultValue;
          }
          sql = util.format("ALTER TABLE %s ALTER COLUMN %s SET DEFAULT %s", tableName, columnName, defaultValue);
        } else {
          sql = util.format("ALTER TABLE %s ALTER COLUMN %s DROP DEFAULT", tableName, columnName);
        }

        this.runSql(sql, callback);
      }
    },

    insert: function(tableName, columnNameArray, valueArray, callback) {
      columnNameArray = columnNameArray.map(function(columnName) {
        return (columnName.charAt(0) != '"') ? '"' + columnName + '"' : columnName;
      });

      return this._super(tableName, columnNameArray, valueArray, callback);
    },

    runSql: function() {
        var callback = arguments[arguments.length - 1];

        params = arguments;
        if (params.length > 2){
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
        if(global.dryRun) {
          return callback();
        }
        this.connection.query.apply(this.connection, params);
    },

    all: function() {
        params = arguments;
        this.connection.query.apply(this.connection, [params[0], function(err, result){
            params[1](err, result.rows);
        }]);
    },

    close: function(callback) {
        this.connection.end();
        callback(null);
    }

});

exports.connect = function(config, callback) {
    if (config.native) { pg = pg.native; }
    var db = config.db || new pg.Client(config);
    callback(null, new PgDriver(db));
};
