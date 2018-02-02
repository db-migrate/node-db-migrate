var dbmUtil = require('db-migrate-shared').util;
var log = require('db-migrate-shared').log;
var Promise = require('bluebird');
var File = require('./file.js');

// Not sure what will happen to this yet
function SeedLink(driver, internals) {
  this.seeder = require('./seeder.js')(
    driver,
    internals.argv['vcseeder-dir'],
    true,
    internals
  );
  this.internals = internals;
  this.links = [];
}

var Walker = function(driver, directory, interface, empty, intern) {
  this.driver = dbmUtil.reduceToInterface(driver, interface);
  this._driver = driver;
  this.directory = directory;
  this.internals = intern;

  // keep it until we decide how we do the cross linking
  if (intern.linked === false) {
    this.seedLink = new SeedLink(driver, intern);
    intern.linked = true;
  }
};

Walker.prototype = {
  createMigrationsTable: function(callback) {
    this._driver.createMigrationsTable(callback);
  },

  writeMigrationRecord: function(migration, callback) {
    function onComplete(err) {
      if (err) {
        log.error(this.prefix + migration.name, err);
      } else {
        log.info(this.prefix + 'Processed', migration.name);
      }
      callback(err);
    }
    this._driver.addMigrationRecord(
      this.internals.matching + '/' + migration.name,
      onComplete
    );
  },

  deleteMigrationRecord: function(migration, callback) {
    function onComplete(err) {
      if (err) {
        log.error(this.prefix + migration.name, err);
      } else {
        log.info(this.prefix + 'Processed', migration.name);
      }
      callback(err);
    }
    this._driver.deleteMigration(
      this.internals.matching + '/' + migration.name,
      function(err) {
        if (!this.internals.matching) {
          this._driver.deleteMigration(migration.name, onComplete);
        } else {
          onComplete.apply(err);
        }
      }.bind(this)
    );
  },

  sync: function(options, callback) {
    return Migration.loadFromDatabase(
      this.directory,
      this._driver,
      this.internals
    )
      .then(completedMigrations => {
        var mode = dbmUtil.syncMode(
          completedMigrations,
          funcOrOpts.destination
        );
        if (mode === 1) {
          log.info(this.prefix + 'Syncing upwards.');
          return this.up(options);
        } else {
          log.info(this.prefix + 'Syncing downwards.');
          return this.down(options);
        }
      })
      .nodeify(callback);
  },

  up: function({ partialName, count }, callback) {
    return Promise.all([
      File.loadFromFilesystem(this.directory, this.internals),
      File.loadFromDatabase(this.directory, this._driver, this.internals)
    ])
      .then(function(allMigrations, completedMigrations) {
        var toRun = dbmUtil.filterUp(
          allMigrations,
          completedMigrations,
          partialName,
          count
        );

        if (toRun.length === 0) {
          log.info(this.prefix + 'Nothing to run');
        }

        return toRun;
      })
      .each(function(migration) {
        log.verbose(this.prefix + 'preparing to run up:', migration.name);
        var version = migration._meta.version || 1;
        require('./executors/versioned/v' + version).up(this.driver, migration);
      })
      .nodeify(callback);
  },

  down: function({ partialName, count }, callback) {
    return File.loadFromDatabase(this.directory, this._driver, this.internals)
      .then(completedMigrations => {
        let toRun = dbmUtil.filterDown(completedMigrations, partialName, count);

        if (toRun.length === 0) {
          log.info(this.prefix + 'Nothing to run');
        }

        return toRun;
      })
      .each(migration => {
        log.verbose(this.prefix + 'preparing to run down:', migration.name);
        let version = migration._meta.version || 1;
        require('./executors/versioned/v' + version).up(this.driver, migration);
      })
      .nodeify(callback);
  }
};

module.exports = Walker;
