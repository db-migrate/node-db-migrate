var util = require('util');
var events = require('events');

module.exports = Base = function() { };
util.inherits(Base, events.EventEmitter);

Base.prototype.createTable = function(tableName, columnSpecs, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.dropTable = function(tableName, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.renameTable = function(tableName, newTableName, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.addColumn = function(tableName, columnName, columnSpec, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.removeColumn = function(tableName, columnName, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.renameColumn = function(tableName, oldColumnName, newColumnName, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.changeColumn = function(tableName, columnName, columnSpec, callback) {
  throw new Error('not yet implemented');
};

/*
* addIndex(tableName, columnName, [indexName, callback])
*/
Base.prototype.addIndex = function(tableName, indexName, columns, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.removeIndex = function(indexName, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.addAssociation = function(tableName, primaryKey, associatedTableName, foreignKey, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.removeAssociation = function(tableName, primaryKey, associatedTableName, foreignKey, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.runSql = function(sql, callback) {
  throw new Error('not yet implemented');
};

Base.prototype.escape = function(str) {
  return str.replace(/'/g, "\'");
};
