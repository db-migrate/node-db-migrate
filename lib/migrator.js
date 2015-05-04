var async = require('async');
var dbmUtil = require('./util');
var Migration = require('./migration');
var log = require('./log');
var Promise = require('bluebird');

var internals = {};

Migrator = function(driver, migrationsDir, empty, intern) {
  this.driver = driver;
  this.migrationsDir = migrationsDir;
  internals = intern;

  internals.migrationOptions.relation = require('./relation');

  Migration.exportInternals(intern);
};

Migrator.prototype = {
  createMigrationTable: function(callback) {
    this.driver.createMigrationTable(callback);
  },

  writeMigrationRecord: function(migration, callback) {
    function onComplete(err) {
      if (err) {
        log.error(migration.name, err);
      } else {
        log.info('Processed migration', migration.name);
      }
      callback(err);
    }
    this.driver.addMigrationRecord(internals.matching + '/' + migration.name, onComplete);
  },

  deleteMigrationRecord: function(migration, callback) {
    function onComplete(err) {
      if (err) {
        log.error(migration.name, err);
      } else {
        log.info('Processed migration', migration.name);
      }
      callback(err);
    }
    this.driver.deleteMigration(internals.matching + '/' + migration.name, function(err) {

      if(!internals.matching) {

        this.driver.deleteMigration(migration.name, onComplete);
      }
      else {

        onComplete.apply(err);
      }
    }.bind(this));
  },

  up: function(funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      funcOrOpts(this.driver, callback);
    } else {
      this.upToBy(funcOrOpts.destination, funcOrOpts.count, callback);
    }
  },

  down: function(funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      funcOrOpts(this.driver, callback);
    } else {
      this.downToBy(funcOrOpts.count, callback);
    }
  },

  upToBy: function(partialName, count, callback) {
    var self = this;
    Migration.loadFromFilesystem(self.migrationsDir, function(err, allMigrations) {
      if (err) { callback(err); return; }

      Migration.loadFromDatabase(self.migrationsDir, self.driver, function(err, completedMigrations) {
        if (err) { callback(err); return; }
        var toRun = dbmUtil.filterUp(allMigrations, completedMigrations, partialName, count);

        if (toRun.length === 0) {
          log.info('No migrations to run');
          callback(null);
          return;
        }

        return Promise.resolve(toRun).each(function(migration) {

          log.verbose('preparing to run up migration:', migration.name);

          return self.driver.startMigration()
          .catch(callback)
          .then(function() {

            var setup = migration.setup();

            if(typeof(setup) === 'function')
              setup(internals.migrationOptions);

            return (Promise.promisify(self.up.bind(self)))(migration.up.bind(migration));
          })
          .catch(callback)
          .then(function() {

            return (Promise.promisify(self.writeMigrationRecord.bind(self)))(migration);
          })
          .catch(callback)
          .then(self.driver.endMigration.bind(self.driver));
        })
        .catch(callback)
        .nodeify(callback);

      });
    });
  },

  downToBy: function(count, callback) {
    var self = this;
    Migration.loadFromDatabase(self.migrationsDir, self.driver, function(err, completedMigrations) {
      if (err) { return callback(err); }

      var toRun = dbmUtil.filterDown(completedMigrations, count);

      if (toRun.length === 0) {
        log.info('No migrations to run');
        callback(null);
        return;
      }

      async.forEachSeries(toRun, function(migration, next) {
        log.verbose('preparing to run down migration:', migration.name);

        var setup = migration.setup();

        if(typeof(setup) === 'function')
          setup(internals.migrationOptions);

         self.driver.startMigration()
          .then(function() {
            self.down(migration.down.bind(migration), function(err) {
              if (err) {

                callback(err);
                return;
              }
              self.deleteMigrationRecord(migration, function(err) {
                if(err) {

                  return callback(err);
                }

                self.driver.endMigration(next);
              });
            });
          }).catch(next);
      }, callback);
    });
  }
};

module.exports = Migrator;
