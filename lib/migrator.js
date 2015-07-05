var dbmUtil = require('./util');
var Migration = require('./migration');
var log = require('./log');
var Promise = require('bluebird');

Migrator = function(driver, migrationsDir, empty, intern) {
  this.driver = driver;
  this.migrationsDir = migrationsDir;
  this.internals = intern;

  this.internals.migrationOptions.relation = require('./relation');

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
    this.driver.addMigrationRecord(this.internals.matching + '/' + migration.name, onComplete);
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
    this.driver.deleteMigration(this.internals.matching + '/' + migration.name, function(err) {

      if(!this.internals.matching) {

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

      Migration.loadFromDatabase(self.migrationsDir, self.driver, self.internals, function(err, completedMigrations) {
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
          .then(function() {

            var setup = migration.setup();

            if(typeof(setup) === 'function')
              setup(self.internals.migrationOptions);

            return (Promise.promisify(self.up.bind(self)))(migration.up.bind(migration));
          })
          .then(function() {

            return (Promise.promisify(self.writeMigrationRecord.bind(self)))(migration);
          })
          .then(self.driver.endMigration.bind(self.driver));
        })
        .catch(function(e) {

          throw e;
        })
        .nodeify(callback);

      });
    });
  },

  downToBy: function(count, callback) {
    var self = this;
    Migration.loadFromDatabase(self.migrationsDir, self.driver, self.internals, function(err, completedMigrations) {
      if (err) { return callback(err); }

      var toRun = dbmUtil.filterDown(completedMigrations, count);

      if (toRun.length === 0) {
        log.info('No migrations to run');
        callback(null);
        return;
      }

      return Promise.resolve(toRun).each(function(migration) {

        log.verbose('preparing to run down migration:', migration.name);

        return self.driver.startMigration()
        .then(function() {
          var setup = migration.setup();

          if(typeof(setup) === 'function')
            setup(self.internals.migrationOptions);

          return (Promise.promisify(self.down.bind(self)))(migration.down.bind(migration));
        })
        .then(function() {
          return (Promise.promisify(self.deleteMigrationRecord.bind(self)))(migration);
        })
        .then(self.driver.endMigration.bind(self.driver));
      })
      .catch(function(e) {

        throw e;
      })
      .nodeify(callback);
    });
  }
};

module.exports = Migrator;
