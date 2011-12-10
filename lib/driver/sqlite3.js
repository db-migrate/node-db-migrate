var sqlite3 = require('sqlite3');

var defaultMode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

Driver = function(connection) {
  this.connection = connection;
};

Driver.prototype.createTable(tableName, columnDefs, callback) {

};

Driver.prototype.dropTable(tableName, callback) {

};

Driver.prototype.addColumn(tableName, columnName, columnDef, callback) {

};

Driver.prototype.removeColumn(tableName, columnName, callback) {

};

Driver.prototype.renameColumn(tableName, oldColumnName, newColumnName, callback) {

};

Driver.prototype.changeColumn(tableName, columnName, columnDef, callback) {

};

/* 
* addIndex(tableName, columnName, [indexName, callback])
*/
Driver.prototype.addIndex(tableName, columnName, indexName, callback) {

};

Driver.prototype.removeIndex(tableName, columnName, indexName, callback) {

};

Driver.prototype.addAssociation(tableName, primaryKey, associatedTableName, foreignKey, callback) {

};

Driver.prototype.removeAssociation(tableName, primaryKey, associatedTableName, foreignKey, callback) {

};

Driver.prototype.runSql(sql, callback) {

};

exports.connect = function(config, callback) {
  var mode = config.mode || defaultMode;
  var db = new sqlite3.Database(config.filename, mode, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, new Driver(db));
    }
  });
};
