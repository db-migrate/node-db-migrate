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

const INTERFACES = {
  migration: require('./interface/migratorInterface.js'),
  seed: require('./interface/seederInterface.js'),
  'static-seed': require('./interface/seederInterface.js')
};

const Walker = function (driver, directory, mode, intern, prefix) {
  this.driver = dbmUtil.reduceToInterface(driver, INTERFACES[prefix]);
  this._driver = driver;
  Promise.promisifyAll(this._driver);
  this.directory = directory;
  this.internals = intern;
  this.mode = mode;

  if (!this.mode) this.prefix = `static-${prefix}`;
  else this.prefix = prefix;

  this.title = `[${prefix}] `;

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
    const onComplete = err => {
      if (err) {
        log.error(this.title + migration.name, err);
      } else {
        log.info(this.title + 'Processed', migration.name);
      }
      callback(err);
    };
    this._driver.addMigrationRecord(
      this.internals.matching + '/' + migration.name,
      onComplete
    );
  },

  deleteMigrationRecord: function (migration, callback) {
    const onComplete = err => {
      if (err) {
        log.error(this.title + migration.name, err);
      } else {
        log.info(this.title + 'Processed', migration.name);
      }
      callback(err);
    };
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
    return File.loadFromDatabase(
      this.directory,
      this.prefix,
      this._driver,
      this.internals
    )
      .then(completedFiles => {
        const mode = dbmUtil.syncMode(completedFiles, options.destination);
        if (mode === 1) {
          log.info(this.title + 'Syncing upwards.');
          return this.up(options);
        } else {
          log.info(this.title + 'Syncing downwards.');
          return this.down(options);
        }
      })
      .nodeify(callback);
  },

  up: function ({ destination: partialName, count }, callback) {
    return Promise.all([
      File.loadFromFileystem(this.directory, this.prefix, this.internals),
      File.loadFromDatabase(
        this.directory,
        this.prefix,
        this._driver,
        this.internals
      )
    ])
      .spread((allFiles, completedFiles) => {
        const toRun = dbmUtil.filterUp(
          allFiles,
          completedFiles,
          partialName,
          count
        );

        if (toRun.length === 0) {
          log.info(this.title + 'Nothing to run');
        }

        return toRun;
      })
      .each(file => {
        log.verbose(this.title + 'preparing to run up:', file.name);
        const version = file.get()._meta.version || 1;
        return require(`./executors/versioned/v${version}`).up(
          this,
          this.driver,
          file
        );
      })
      .nodeify(callback);
  },

  down: function ({ destination: partialName, count }, callback) {
    return File.loadFromDatabase(
      this.directory,
      this.prefix,
      this._driver,
      this.internals
    )
      .then(completedFiles => {
        const toRun = dbmUtil.filterDown(completedFiles, partialName, count);

        if (toRun.length === 0) {
          log.info(this.title + 'Nothing to run');
        }

        return toRun;
      })
      .each(file => {
        log.verbose(this.title + 'preparing to run down:', file.name);
        const version = file.get()._meta.version || 1;
        return require(`./executors/versioned/v${version}`).down(
          this,
          this.driver,
          file
        );
      })
      .nodeify(callback);
  }
};

module.exports = Walker;
