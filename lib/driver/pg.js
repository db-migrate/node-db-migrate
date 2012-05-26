var util = require('util');
var pg = require('pg');
var Base = require('./base');
var type = require('../data_type');


var PgDriver = Base.extend({
    init: function(connection) {
        this._super();
        this.connection = connection;
        this.connection.connect();
    },

    createColumnDef: function(name, spec, options) {
        return [name, spec.autoIncrement ? '' : this.mapDataType(spec.type), this.createColumnConstraint(spec, options)].join(' ');
    },
    mapDataType: function(str) {
        switch(str) {
          case type.DATE_TIME:
            return 'TIMESTAMP';
        }
        return this._super(str);
    },

    createColumnConstraint: function(spec, options) {
        var constraint = [];
        if (spec.primaryKey && options.emitPrimaryKey) {
            if (spec.autoIncrement) {
                constraint.push('SERIAL');
            } else {
                constraint.push('PRIMARY KEY');
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
        this.runSql(sql, callback);
    },

    //removeColumn: function(tableName, columnName, callback) {
    //},

    //renameColumn: function(tableName, oldColumnName, newColumnName, callback) {
    //};

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