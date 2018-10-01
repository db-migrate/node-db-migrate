var dbmUtil = require('db-migrate-shared').util;
var Migration = require('./migration');
var log = require('db-migrate-shared').log;
var Promise = require('bluebird');
var MigratorInterface = require('./interface/migratorInterface.js');

function SeedLink (driver, internals) {
  this.seeder = require('./seeder.js')(
    driver,
    internals.argv['vcseeder-dir'],
    true,
    internals
  );
  this.internals = internals;
  this.links = [];
}
SeedLink.prototype = {
  seed: function (partialName) {
    var reset = !this.internals.notransactions;

    this.internals.notransactions = true;

    return new Promise(function (resolve, reject) {
      this.seeder.up(partialName, function (err) {
        if (reset) {
          this.internals.notransactions = false;
        }

        if (err) {
          reject(err);
        } else {
          resolve(err);
        }
      });
    });
  },

  link: function (partialName) {
    this.links.push(partialName);
  },

  process: function () {
    this.clear();
  },

  clear: function () {
    this.links = [];
  }
};

var Migrator = function (driver, migrationsDir, empty, intern) {
  this.driver = dbmUtil.reduceToInterface(driver, MigratorInterface);
  this._driver = driver;
  this.migrationsDir = migrationsDir;
  this.internals = intern;

  if (intern.linked === false) {
    this.seedLink = new SeedLink(driver, intern);
    intern.linked = true;
  }

  this.internals.migrationOptions.relation = require('./relation');
};

Migrator.prototype = {
  createMigrationsTable: function (callback) {
    this._driver.createMigrationsTable(callback);
  },

  writeMigrationRecord: function (migration, callback) {
    function onComplete (err) {
      if (err) {
        log.error(migration.name, err);
      } else {
        log.info('Processed migration', migration.name);
      }
      callback(err);
    }
    this._driver.addMigrationRecord(
      this.internals.matching + '/' + migration.name,
      onComplete
    );
  },

  deleteMigrationRecord: function (migration, callback) {
    function onComplete (err) {
      if (err) {
        log.error(migration.name, err);
      } else {
        log.info('Processed migration', migration.name);
      }
      callback(err);
    }
    this._driver.deleteMigration(
      this.internals.matching + '/' + migration.name,
      function (err) {
        if (!this.internals.matching) {
          this._driver.deleteMigration(migration.name, onComplete);
        } else {
          onComplete.apply(err);
        }
      }.bind(this)
    );
  },

  up: function (funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      return funcOrOpts(this.driver, callback);
    } else {
      this.upToBy(funcOrOpts.destination, funcOrOpts.count, callback);
    }
  },

  down: function (funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      return funcOrOpts(this.driver, callback);
    } else {
      this.downToBy(funcOrOpts.destination, funcOrOpts.count, callback);
    }
  },

  check: function (funcOrOpts, callback) {
    var self = this;
    Migration.loadFromFilesystem(self.migrationsDir, self.internals, function (
      err,
      allMigrations
    ) {
      if (err) {
        callback(err);
        return;
      }

      Migration.loadFromDatabase(
        self.migrationsDir,
        self._driver,
        self.internals,
        function (err, completedMigrations) {
          if (err) {
            callback(err);
            return;
          }

          // Requires pr to export filterCompleted from db-migrate-shared
          var toRun = dbmUtil.filterCompleted(
            allMigrations,
            completedMigrations
          );

          log.info('Migrations to run:', toRun.map(migration => migration.name));
          callback(null, toRun);
        }
      );
    });
  },

  sync: function (funcOrOpts, callback) {
    var self = this;

    Migration.loadFromDatabase(
      self.migrationsDir,
      self._driver,
      self.internals,
      function (err, completedMigrations) {
        if (err) {
          callback(err);
          return;
        }

        var mode = dbmUtil.syncMode(
          completedMigrations,
          funcOrOpts.destination
        );
        if (mode === 1) {
          log.info('Syncing upwards.');
          self.up(funcOrOpts, callback);
        } else {
          log.info('Syncing downwards.');
          self.down(funcOrOpts, callback);
        }
      }
    );
  },

  upToBy: function (partialName, count, callback) {
    var self = this;
    Migration.loadFromFilesystem(self.migrationsDir, self.internals, function (
      err,
      allMigrations
    ) {
      if (err) {
        callback(err);
        return;
      }

      Migration.loadFromDatabase(
        self.migrationsDir,
        self._driver,
        self.internals,
        function (err, completedMigrations) {
          if (err) {
            callback(err);
            return;
          }
          var toRun = dbmUtil.filterUp(
            allMigrations,
            completedMigrations,
            partialName,
            count
          );

          if (toRun.length === 0) {
            log.info('No migrations to run');
            callback(null);
            return;
          }

          if (self.internals.check) {
            var toRunNames = toRun.map(migration => migration.name);
            log.info('Migrations to run:', toRunNames);
            callback(null, toRunNames);
            return;
          }

          return Promise.resolve(toRun)
            .each(function (migration) {
              log.verbose('preparing to run up migration:', migration.name);

              return self.driver
                .startMigration()
                .then(function () {
                  var setup = migration.setup();

                  if (typeof setup === 'function') {
                    setup(self.internals.migrationOptions, self.seedLink);
                  }

                  return self.up(migration.up.bind(migration));
                })
                .then(function () {
                  if (self.seedLink && self.seedLink.links.length) {
                    log.info('Calling linked seeds');

                    return self.seedLink.process();
                  }
                })
                .then(function () {
                  return Promise.promisify(
                    self.writeMigrationRecord.bind(self)
                  )(migration);
                })
                .then(self.driver.endMigration.bind(self.driver));
            })
            .nodeify(callback);
        }
      );
    });
  },

  downToBy: function (partialName, count, callback) {
    var self = this;
    Migration.loadFromDatabase(
      self.migrationsDir,
      self._driver,
      self.internals,
      function (err, completedMigrations) {
        if (err) {
          return callback(err);
        }

        var toRun = dbmUtil.filterDown(completedMigrations, partialName, count);

        if (toRun.length === 0) {
          log.info('No migrations to run');
          callback(null);
          return;
        }

        if (self.internals.check) {
          var toRunNames = toRun.map(migration => migration.name);
          log.info('Migrations to run:', toRunNames);
          callback(null, toRunNames);
          return;
        }

        return Promise.resolve(toRun)
          .each(function (migration) {
            log.verbose('preparing to run down migration:', migration.name);

            return self.driver
              .startMigration()
              .then(function () {
                var setup = migration.setup();

                if (typeof setup === 'function') {
                  setup(self.internals.migrationOptions, self.seedLink);
                }

                return self.down(migration.down.bind(migration));
              })
              .then(function () {
                if (self.seedLink && self.seedLink.links.length) {
                  log.info('Calling linked seeds');

                  return self.seedLink.process();
                }
              })
              .then(function () {
                return Promise.promisify(
                  self.deleteMigrationRecord.bind(self)
                )(migration);
              })
              .then(self.driver.endMigration.bind(self.driver));
          })
          .nodeify(callback);
      }
    );
  }
};

module.exports = Migrator;
