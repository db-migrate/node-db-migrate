var driver = require('./lib/driver');
var Migrator = require('./lib/migrator');
var log = require('./lib/log');

exports.dataType = require('./lib/data_type');
exports.config = require('./lib/config');

var coffeeSupported = false;
var coffeeModule = null;
try {
  coffeeModule = require('coffee-script');
  if (coffeeModule && coffeeModule.register) coffeeModule.register();
  coffeeSupported = true;
} catch (e) {
  log.warn('CoffeeScript not installed');
}

exports.connect = function(config, callback) {
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }
    callback(null, new Migrator(db, config['migrations-dir']));
  });
};

exports.createMigration = function(title, migrationsDir, callback) {
  var extension = coffeeSupported ? '.coffee' : '.js';
  var migration = new Migration(title + extension, migrationsDir, new Date());
  migration.write(function(err) {
    if (err) { callback(err); return; }
    callback(null, migration);
  });
};
