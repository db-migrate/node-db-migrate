'use strict';

const dbmUtil = require('db-migrate-shared').util;
const State = require('./state');
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
  /**
   * i: index
   * c: schema
   * f: foreignKey
   * e: extra items for the schema (like ENUM tyes)
   */
  this.internals.schema = { i: {}, c: {}, f: {}, e: {} };
  /**
   * s: commands
   * i: index
   * f: foreignKey
   * c: schema
   */
  this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
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
  createTables: async function () {
    await State.init(this._driver, this.internals);
    return this._driver._createList(this.internals.migrationTable);
  },

  createMigrationsTable: function () {
    if (
      typeof this._driver._createList !== 'function' ||
      typeof this._driver._getList !== 'function' ||
      typeof this._driver._createKV !== 'function' ||
      typeof this._driver._getKV !== 'function' ||
      typeof this._driver._deleteKV !== 'function' ||
      typeof this._driver._deleteEntry !== 'function' ||
      typeof this._driver._insertEntry !== 'function' ||
      typeof this._driver._insertKV !== 'function'
    ) {
      log.warn(
        'The driver you are using does not support the new state management. ' +
          'Please raise an issue in the repository of your driver maintainer'
      );

      if (typeof this._driver._createList !== 'function') {
        return this._driver.createMigrationsTableAsync();
      }
    }

    return this.createTables();
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

  up: function (options, callback) {
    const partialName = options.destination;
    const count = options.count;
    const files = Promise.all([
      File.loadFromFileystem(this.directory, this.prefix, this.internals),
      File.loadFromDatabase(
        this.directory,
        this.prefix,
        this._driver,
        this.internals
      )
    ]).spread((allFiles, completedFiles) => {
      const toRun = dbmUtil.filterUp(
        allFiles,
        completedFiles,
        partialName,
        count
      );

      if (toRun.length === 0) {
        log.info(this.title + 'Nothing to run');
      }

      if (this.internals.check) {
        const toRunNames = toRun.map(migration => migration.name);
        log.info(this.title + 'run:', toRunNames);
        return toRunNames;
      }

      return toRun;
    });

    if (this.internals.check) {
      return files.nodeify(callback);
    }

    return files
      .each(file => {
        log.verbose(this.title + 'preparing to run up:', file.name);
        const _meta = file.get()._meta || {};
        const version = _meta.version || 1;
        this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
        return require(`./executors/versioned/v${version}`).up(
          this,
          this.driver,
          file
        );
      })
      .nodeify(callback);
  },

  down: function (options, callback) {
    const partialName = options.destination;
    const count = options.count;

    const files = File.loadFromDatabase(
      this.directory,
      this.prefix,
      this._driver,
      this.internals
    ).then(completedFiles => {
      const toRun = dbmUtil.filterDown(completedFiles, partialName, count);

      if (toRun.length === 0) {
        log.info(this.title + 'Nothing to run');
      }

      if (this.internals.check) {
        const toRunNames = toRun.map(migration => migration.name);
        log.info(this.title + 'run:', toRunNames);
        return toRunNames;
      }

      return toRun;
    });

    if (this.internals.check) {
      return files.nodeify(callback);
    }

    return files
      .each(file => {
        log.verbose(this.title + 'preparing to run down:', file.name);
        const _meta = file.get()._meta || {};
        const version = _meta.version || 1;
        this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
        return require(`./executors/versioned/v${version}`).down(
          this,
          this.driver,
          file
        );
      })
      .nodeify(callback);
  },

  check: function (options, callback) {
    return Promise.all([
      File.loadFromDatabase(
        this.directory,
        this.prefix,
        this._driver,
        this.internals
      ),
      File.loadFromFileystem(this.directory, this.prefix, this.internals)
    ])
      .spread((completedFiles, allFiles) => {
        // Requires pr to export filterCompleted from db-migrate-shared
        const toRun = dbmUtil.filterCompleted(allFiles, completedFiles);

        log.info(
          'Files to run:',
          toRun.map(migration => migration.name)
        );
        return toRun;
      })
      .nodeify(callback);
  }
};

module.exports = Walker;
