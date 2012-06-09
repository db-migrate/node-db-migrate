var util = require('util');
var pg = require('pg');
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
        this.runSql('BEGIN;', function() { cb()});
    },

    endMigration: function(cb){
        this.runSql('COMMIT;', function(){cb(null)});
    },

    createColumnDef: function(name, spec, options) {
        var type = spec.autoIncrement ? '' : this.mapDataType(spec.type);
        var len = spec.length ? util.format('(%s)', spec.length) : '';
        var constraint = this.createColumnConstraint(spec, options);
        return [name, type, len, constraint].join(' ');
    },

    mapDataType: function(str) {
        switch(str) {
          case type.STRING:
            return 'VARCHAR';
          case type.DATE_TIME:
            return 'TIMESTAMP';
          case type.BLOG:
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
      }
      this.createTable('migrations', options, callback);
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
        var sql = util.format('ALTER TABLE %s RENAME TABLE TO %s', tableName, newTableName);
        this.runSql(sql, callback);
    },

    removeColumn: function(tableName, columnName, callback) {
        var sql = util.format("ALTER TABLE %s DROP COLUMN %s", tableName, columnName);
        this.runSql(sql, callback);
    },

    renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
        var sql = util.format("ALTER TABLE %s RENAME COLUMN %s TO %s", tableName, oldColumnName, newColumnName);
        this.runSql(sql, callback)
    },

    //changeColumn: function(tableName, columnName, columnSpec, callback) {
    //},

    runSql: function() {
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
        log.info('pg.runSql', params);
        this.connection.query.apply(this.connection, params);
    },

    all: function() {
        params = arguments;
        this.connection.query.apply(this.connection, [params[0], function(err, result){
            params[1](err, result.rows);
        }]);
    },

    close: function() {
        this.connection.end();
    }

});

exports.connect = function(config, callback) {
    var db = config.db || new pg.Client(config);
    callback(null, new PgDriver(db));
};
