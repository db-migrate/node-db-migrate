var Seed = require('./seed');
var log = require('db-migrate-shared').log;
var dbmUtil = require('db-migrate-shared').util;
var Promise = require('bluebird');
var SeederInterface = require('./interface/seederInterface.js');

var internals = {};

function MigrationLink (driver, internals) {
  this.migrator = require('./migrator.js')(
    driver,
    internals.migrationsDir,
    null,
    internals
  );
  this.links = [];
}

MigrationLink.prototype = {
  link: function (partialName) {
    this.links.push(partialName);
  },

  migrate: function (partialName) {
    var reset = !internals.notransactions;

    internals.notransactions = true;

    return new Promise(function (resolve, reject) {
      this.migrator.up(partialName, function (err) {
        if (reset) {
          internals.notransactions = false;
        }

        if (err) {
          reject(err);
        } else {
          resolve(err);
        }
      });
    });
  },

  process: function () {
    var reset = !internals.notransactions;

    internals.notransactions = true;

    return new Promise(
      function (resolve, reject) {
        var keys = Object.keys(this.links);
        var i = 0;

        var migrate = function (i) {
          if (i < keys.length) {
            if (reset) {
              internals.notransactions = false;
            }

            resolve();
            this.clear();
          }

          this.migrator.up(
            {
              destination: this.links[keys[i]]
            },
            function (err) {
              if (err) {
                if (reset) {
                  internals.notransactions = false;
                }

                reject(err);
              } else {
                migrate(++i);
              }
            }
          );
        }.bind(this);

        migrate(i);
      }.bind(this)
    );
  },

  clear: function () {
    this.links = [];
  }
};

var Seeder = function (driver, seedsDir, versionControlled, intern) {
  SeederInterface.extending = intern.interfaces.SeederInterface;
  this.driver = dbmUtil.reduceToInterface(driver, SeederInterface);
  this._driver = driver;
  this.seedDir = seedsDir;
  this.isVC = versionControlled;

  if (intern.linked === false) {
    intern.linked = true;
    this.migrationLink = new MigrationLink(driver, intern);
  }

  internals = intern;
  this.internals = intern;
};

Seeder.prototype = {
  createSeedsTable: function (callback) {
    this._driver.createSeedsTable(callback);
  },

  seed: function (argv, callback) {
    if (this.isVC) {
      this.up(argv, callback);
    } else {
      this._staticSeed(argv.destination, callback);
    }
  },

  up: function (funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      return funcOrOpts(this.driver, false, callback);
    } else {
      this.upToBy(funcOrOpts.destination, funcOrOpts.count, callback);
    }
  },

  down: function (funcOrOpts, callback) {
    if (dbmUtil.isFunction(funcOrOpts)) {
      return funcOrOpts(this.driver, callback);
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

    return Seed.loadFromFilesystem(self.seedDir, self.internals, function (
      err,
      allSeeds
    ) {
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

      return Promise.resolve(toRun)
        .each(function (seeder) {
          log.verbose('preparing to run up seeder:', seeder.name);

          var setup = seeder.setup();
          if (typeof setup === 'function') {
            setup(self.internals.seederOptions);
          }

          return self._driver
            .startMigration()
            .catch(callback)
            .then(function () {
              return seeder.up(self.driver, true);
            });
        })
        .then(self._driver.endMigration.bind(self.driver))
        .then(function () {
          callback();
        })
        .catch(function (e) {
          throw e;
        });
    });
  },

  writeSeedRecord: function (seed, callback) {
    function onComplete (err) {
      if (err) {
        log.error(seed.name, err);
      } else {
        log.info('Processed seed', seed.name);
      }
      callback(err);
    }
    this._driver.addSeedRecord(
      this.internals.matching + '/' + seed.name,
      onComplete
    );
  },

  deleteSeedRecord: function (seed, callback) {
    function onComplete (err) {
      if (err) {
        log.error(seed.name, err);
      } else {
        log.info('Processed seed', seed.name);
      }
      callback(err);
    }
    this._driver.deleteSeed(
      this.internals.matching + '/' + seed.name,
      function (err) {
        if (!this.internals.matching) {
          this._driver.deleteSeed(seed.name, onComplete);
        } else {
          onComplete.apply(err);
        }
      }.bind(this)
    );
  },

  upToBy: function (partialName, count, callback) {
    var self = this;

    return Seed.loadFromFilesystem(self.seedDir, self.internals, function (
      err,
      allMigrations
    ) {
      if (err) {
        callback(err);
        return;
      }

      return Seed.loadFromDatabase(
        self.seedDir,
        self._driver,
        self.internals,
        function (err, completedSeeds) {
          if (err) {
            callback(err);
            return;
          }
          var toRun = dbmUtil.filterUp(
            allMigrations,
            completedSeeds,
            partialName,
            count
          );

          if (toRun.length === 0) {
            log.info('No seeds to run');
            callback(null);
            return;
          }

          return Promise.resolve(toRun)
            .each(function (seeder) {
              log.verbose('preparing to run up seeder:', seeder.name);

              return self._driver
                .startMigration()
                .then(function () {
                  var setup = seeder.setup();
                  if (typeof setup === 'function') {
                    setup(self.internals.seederOptions, self.migrationLink);
                  }

                  return self.up(seeder.up.bind(seeder));
                })
                .then(function () {
                  if (self.seedLink && self.seedLink.links.length) {
                    log.info('Calling linked migrations');

                    return self.seedLink.process(self.migrationLink);
                  }
                })
                .then(function () {
                  return Promise.promisify(
                    self.writeSeedRecord.bind(self)
                  )(seeder);
                })
                .then(self._driver.endMigration.bind(self.driver))
                .catch(function (e) {
                  throw e;
                });
            })
            .then(function () {
              callback();
            });
        }
      );
    });
  },

  downToBy: function (count, callback) {
    var self = this;
    Seed.loadFromDatabase(self.seedDir, self._driver, self.internals, function (
      err,
      completedSeeds
    ) {
      if (err) {
        return callback(err);
      }

      var toRun = dbmUtil.filterDown(completedSeeds, count);

      if (toRun.length === 0) {
        log.info('No migrations to run');
        callback(null);
        return;
      }

      return Promise.resolve(toRun)
        .each(function (seeder) {
          log.verbose('preparing to run down seeder:', seeder.name);

          return self._driver
            .startMigration()
            .then(function () {
              var setup = seeder.setup();

              if (typeof setup === 'function') {
                setup(self.internals.seederOptions, self.migrationLink);
              }

              return self.down(seeder.down.bind(seeder));
            })
            .then(function () {
              if (self.seedLink && self.seedLink.links.length) {
                log.info('Calling linked migrations');

                return self.seedLink.process();
              }
            })
            .then(function () {
              return Promise.promisify(
                self.deleteSeedRecord.bind(self)
              )(seeder);
            })
            .then(self._driver.endMigration.bind(self.driver))
            .catch(function (e) {
              throw e;
            });
        })
        .then(function () {
          callback();
        });
    });
  }
};
module.exports = Seeder;
