var Seed = require('./seed');
var log = require('./log');
var dbmUtil = require('./util');
var Promise = require('bluebird');

var internals = {};

Seeder = function (driver, seedsDir, versionControlled, intern) {
  this.driver = driver;
  this.seedDir = seedsDir;
  this.isVC = versionControlled;
  internals = intern;
};

Seeder.prototype = {

  seed: function (argv, callback) {

    if (this.isVC)
      this.up(argv, callback);
    else
      this._staticSeed(argv.destination, callback);
  },

  up: function(funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      funcOrOpts(this.driver, false, callback);
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

  /**
    * Statically call two methods from a static seeder.
    *
    * First: cleanSeeds
    * Second: seed
    *
    * It's highly recommended to not use version controlled seeders at the same
    * time as statics. While the cleanSeeds most of the time, the user executes
    * truncates or deletes on his database. A VC-Seeder can't detect this
    * and thus the state keeps the same, even if all changes of the VC-Seeder
    * are gone.
    *
    * Nevertheless, there is a possiblity to use static seeders together with
    * VC-Seeder, if you keep everything organized well at least.
    *
    * If a single seed is linked with it's tables and databases which it got
    * applied to, the state table of the seeds will automatically cleaned up.
    *
    */
  _staticSeed: function (partialName, callback) {

    var self = this;

    return Seed.loadFromFilesystem(self.seedDir, function(err, allSeeds) {

      if (err) {

        callback(err);
        return;
      }

      var toRun = dbmUtil.filterUp(allSeeds, [], partialName);

      if (toRun.length === 0) {
        log.info('No seeds to run');
        callback(null);
        return;
      }

      return Promise.resolve(toRun).each(function(seeder) {
        log.verbose('preparing to run up seeder:', seeder.name);

        return self.driver.startMigration()
          .catch(callback)
          .then(function() {

            return (Promise.promisify(seeder.up.bind(seeder)))(self.driver, true);
          });
      })
      .catch(callback)
      .then(self.driver.endMigration.bind(self.driver))
      .catch(callback)
      .nodeify(callback);
    });
  },

  upToBy: function(partialName, count, callback) {

    var self = this;

    return Migration.loadFromFilesystem(self.seedDir, function(err, allMigrations) {

      if (err) { callback(err); return; }

      return Migration.loadFromDatabase(self.seedDir, self.driver, function(err, completedMigrations) {

        if (err) { callback(err); return; }
        var toRun = dbmUtil.filterUp(allMigrations, completedMigrations, partialName, count);

        if (toRun.length === 0) {
          log.info('No seeds to run');
          callback(null);
          return;
        }

        return Promise.resolve(toRun).each(function(seeder) {

          log.verbose('preparing to run up seeder:', seeder.name);

          return self.driver.startMigration()
          .catch(callback)
          .then(function() {
            return (Promise.promisify(self.up.bind(self)))(seeder.up.bind(seeder));
          });
        })
        .catch(callback)
        .then(self.driver.endMigration.bind(self.driver))
        .catch(callback)
        .nodeify(callback);

      });
    });
  },

  downToBy: function(count, callback) {
    var self = this;
    Migration.loadFromDatabase(self.seedDir, self.driver, function(err, completedMigrations) {
      if (err) { return callback(err); }

      var toRun = dbmUtil.filterDown(completedMigrations, count);

      if (toRun.length === 0) {
        log.info('No migrations to run');
        callback(null);
        return;
      }

      return Promise.resolve(toRun).each(function(seeder) {

        log.verbose('preparing to run down seeder:', seeder.name);

        return self.driver.startMigration()
          .catch(callback)
          .then(function() {
            return (Promise.promisify(self.down.bind(self)))(seeder.down.bind(seeder));
          });

      })
      .catch(callback)
      .then(self.driver.endMigration.bind(self.driver))
      .catch(callback)
      .nodeify(callback);
    });
  }
};

module.exports = Seeder;
