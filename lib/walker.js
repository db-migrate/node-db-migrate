'use strict';

const dbmUtil = require('db-migrate-shared').util;
const log = require('db-migrate-shared').log;
const Promise = require('bluebird');
const File = require('./file.js');

// Not sure what will happen to this yet
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

const Walker = function (driver, directory, Interface, empty, intern) {
  this.driver = dbmUtil.reduceToInterface(driver, Interface);
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
  createMigrationsTable: function (callback) {
    this._driver.createMigrationsTable(callback);
  },

  writeMigrationRecord: function (migration, callback) {
    function onComplete (err) {
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

  deleteMigrationRecord: function (migration, callback) {
    function onComplete (err) {
      if (err) {
        log.error(this.prefix + migration.name, err);
      } else {
        log.info(this.prefix + 'Processed', migration.name);
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

  sync: function (options, callback) {
    return File.loadFromDatabase(this.directory, this._driver, this.internals)
      .then(completedFiles => {
        const mode = dbmUtil.syncMode(completedFiles, options.destination);
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

  up: function ({ partialName, count }, callback) {
    return Promise.all([
      File.loadFromFilesystem(this.directory, this.internals),
      File.loadFromDatabase(this.directory, this._driver, this.internals)
    ])
      .then((allFiles, completedFiles) => {
        const toRun = dbmUtil.filterUp(
          allFiles,
          completedFiles,
          partialName,
          count
        );

        if (toRun.length === 0) {
          log.info(this.prefix + 'Nothing to run');
        }

        return toRun;
      })
      .each(file => {
        log.verbose(this.prefix + 'preparing to run up:', file.name);
        const version = file.get()._meta.version || 1;
        require(`./executors/versioned/v${version}`).up(this.driver, file);
      })
      .nodeify(callback);
  },

  down: function ({ partialName, count }, callback) {
    return File.loadFromDatabase(this.directory, this._driver, this.internals)
      .then(completedFiles => {
        const toRun = dbmUtil.filterDown(completedFiles, partialName, count);

        if (toRun.length === 0) {
          log.info(this.prefix + 'Nothing to run');
        }

        return toRun;
      })
      .each(file => {
        log.verbose(this.prefix + 'preparing to run down:', file.name);
        const version = file.get()._meta.version || 1;
        require(`./executors/versioned/v${version}`).down(this.driver, file);
      })
      .nodeify(callback);
  }
};

module.exports = Walker;
