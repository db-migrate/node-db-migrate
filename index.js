
var config = require('./lib/config');
var Migrator = require('./lib/migrator');
exports.dataType = require('./lib/data_type');

exports.connect = function(options, callback) {
  config['__connect'] = options;
  config.setCurrent('__connect');
  var env = config.getCurrent();
  var driver = require('./lib/driver');
  driver.connect(env, function(err, db) {
    if (err) { callback(err); return; }
    db.createMigrationsTable(function(err) {
      if (err) { callback(err); return; }
      callback(null, new Migrator(db));
    });
  });
}
