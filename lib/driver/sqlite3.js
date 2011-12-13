var util = require('util');
var sqlite3 = require('sqlite3').verbose();
var Base = require('./base');
var type = require('../data_type');

var defaultMode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

var mapDataType = function(str) {
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
};

var normalizeColumnSpec = function(obj) {
  if (typeof(obj) === 'string') {
    return { type: obj };
  } else {
    return obj;
  }
};

var createColumnDef = function(name, spec) {
  spec = normalizeColumnSpec(spec);
  return [name, mapDataType(spec.type), createColumnConstraint(spec)].join(' ');
}

var createColumnConstraint = function(spec) {
  var constraint = [];
  if (spec.primaryKey) {
    constraint.push('PRIMARY KEY');
    if (spec.autoIncrement) {
      constraint.push('AUTOINCREMENT');
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

  if (spec.collate) {
    constraint.push('COLLATE');
    constraint.push(spec.collate);
  }

  return constraint.join(' ');
};


Driver = function(connection) {
  this.connection = connection;
};
util.inherits(Driver, Base);

Driver.prototype.createMigrationsTable = function(callback) {
  var columnDefs = [
    createColumnDef('name', { type: type.STRING, notNull: true, primaryKey: true}),
    createColumnDef('run_on', { type: type.DATE_TIME, notNull: true}),
  ];
  var sql = util.format('CREATE TABLE IF NOT EXISTS %s (%s)', 'migrations', columnDefs.join(', '));
  this.runSql(sql, callback);
};

Driver.prototype.createTable = function(tableName, columnSpecs, callback) {
  var columnDefs = [];
  for (var columnName in columnSpecs) {
    columnDefs.push(createColumnDef(columnName, columnSpecs[columnName]));  
  }
  var sql = util.format('CREATE TABLE %s (%s)', tableName, columnDefs.join(', '));
  this.runSql(sql, callback);
};

Driver.prototype.dropTable = function(tableName, callback) {
  var sql = util.format('DROP TABLE %s', tableName);
  this.runSql(sql, callback);
};

Driver.prototype.renameTable = function(tableName, newTableName, callback) {
  var sql = util.format('ALTER TABLE %s RENAME TO %s', tableName, newTableName);
  this.runSql(sql, callback);
};

Driver.prototype.addColumn = function(tableName, columnName, columnSpec, callback) {
  var def = createColumnDef(columnName, columnSpec);
  var sql = util.format('ALTER TABLE %s ADD COLUMN %s', tableName, def);
  this.runSql(sql, callback);
};

//Driver.prototype.removeColumn = function(tableName, columnName, callback) {
//};

//Driver.prototype.renameColumn = function(tableName, oldColumnName, newColumnName, callback) {
//};

//Driver.prototype.changeColumn = function(tableName, columnName, columnSpec, callback) {
//};

Driver.prototype.addIndex = function(tableName, indexName, columns, callback) {
  if (!Array.isArray(columns)) {
    columns = [columns];
  }
  var sql = util.format('CREATE INDEX %s ON %s (%s)', indexName, tableName, columns.join(', '));
  this.runSql(sql, callback);
};

Driver.prototype.removeIndex = function(indexName, callback) {
  var sql = util.format('DROP INDEX %s', indexName);
  this.runSql(sql, callback);
};

Driver.prototype.runSql = function(sql, callback) {
  this.connection.run(sql, callback);
};

Driver.prototype.all = function() {
  this.connection.all.apply(this.connection, arguments);
};

exports.connect = function(config, callback) {
  var mode = config.mode || defaultMode;
  var db = new sqlite3.Database(config.filename, mode);
  db.on("error", callback);
  db.on("open", function() {
    callback(null, new Driver(db));
  });
};
