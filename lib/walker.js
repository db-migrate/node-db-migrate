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

/**
 * Name the migration an error belongs to, for the error output.
 */
const failedIn = file => err => {
  if (err && typeof err === 'object' && err.migration === undefined) {
    err.migration = file.name;
  }

  throw err;
};

const Walker = function (driver, directory, mode, intern, prefix, opts = {}) {
  this.driver = dbmUtil.reduceToInterface(driver, INTERFACES[prefix]);
  this._driver = driver;
  this._pdriver = opts.db2;
  Promise.promisifyAll(this._driver);
  Promise.promisifyAll(this._pdriver);
  this.directory = directory;
  this.internals = intern;
  /**
   * i: index
   * c: schema
   * f: foreignKey
   * e: extra items for the schema (like ENUM types)
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
  createTables: async function (options) {
    await State.init(this._pdriver, this.internals, options);
    return State.createConcurrently(() =>
      this._driver._createList(this.internals.migrationTable)
    );
  },

  createMigrationsTable: function (options = {}) {
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

    return this.createTables(options);
  },

  /**
   * Determine what to run first, only lock when there is actually something
   * to run. If another process holds the lock, wait for its release and
   * determine again, the other process might have done the work already.
   * Once we hold the lock, state and pending migrations are read again.
   */
  _withLock: async function (determine, run) {
    if (this.prefix !== 'migration' || this.internals.dryRun) {
      return run(await determine());
    }

    if (!State.supportsLock(this._pdriver)) {
      log.warn(
        this.title +
          'Your database driver does not support migration locking, ' +
          'concurrent processes are not prevented from migrating at the ' +
          'same time. Update your driver to a version supporting it.'
      );
      return run(await determine());
    }

    let stale = null;
    let toRun = await determine();

    while (toRun.length > 0) {
      if (await State.acquire(this._pdriver, this.internals, stale)) {
        break;
      }

      log.info(this.title + 'Waiting for the migration lock of another process');
      stale = await State.waitForRelease(this._pdriver, this.internals);
      toRun = await determine();
    }

    if (toRun.length === 0) {
      return run(toRun);
    }

    try {
      await State.reloadSchema(this._pdriver, this.internals);
      return await run(await determine());
    } finally {
      await State.release(this._pdriver, this.internals);
    }
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
    const determine = () =>
      Promise.all([
        File.loadFromFileystem(this.directory, this.prefix, this.internals),
        File.loadFromDatabase(
          this.directory,
          this.prefix,
          this._driver,
          this.internals
        )
      ]).spread((allFiles, completedFiles) =>
        dbmUtil.filterUp(allFiles, completedFiles, partialName, count)
      );

    if (this.internals.check) {
      return determine()
        .then(toRun => this._checkResult(toRun))
        .nodeify(callback);
    }

    return Promise.resolve(
      this._withLock(determine, toRun => {
        if (toRun.length === 0) {
          log.info(this.title + 'Nothing to run');
        }

        return Promise.each(toRun, file => {
          log.verbose(this.title + 'preparing to run up:', file.name);
          const _meta = file.get()._meta || {};
          const version = _meta.version || 1;
          this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
          return Promise.resolve(
            require(`./executors/versioned/v${version}`).up(
              this,
              this.driver,
              file
            )
          ).catch(failedIn(file));
        });
      })
    ).nodeify(callback);
  },

  down: function (options, callback) {
    const partialName = options.destination;
    const count = options.count;
    const determine = () =>
      File.loadFromDatabase(
        this.directory,
        this.prefix,
        this._driver,
        this.internals
      ).then(completedFiles =>
        dbmUtil.filterDown(completedFiles, partialName, count)
      );

    if (this.internals.check) {
      return determine()
        .then(toRun => this._checkResult(toRun))
        .nodeify(callback);
    }

    return Promise.resolve(
      this._withLock(determine, toRun => {
        if (toRun.length === 0) {
          log.info(this.title + 'Nothing to run');
        }

        return Promise.each(toRun, file => {
          log.verbose(this.title + 'preparing to run down:', file.name);
          const _meta = file.get()._meta || {};
          const version = _meta.version || 1;
          this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
          return Promise.resolve(
            require(`./executors/versioned/v${version}`).down(
              this,
              this.driver,
              file
            )
          ).catch(failedIn(file));
        });
      })
    ).nodeify(callback);
  },

  fix: function (options, callback) {
    const partialName = options.destination;
    const count = options.count;
    const sortFn = function (a, b) {
      a = a.name.slice(0, a.name.indexOf('-'));
      b = b.name.slice(0, b.name.indexOf('-'));

      if (!isNaN(a)) {
        return a - b;
      }

      return a.localeCompare(b);
    };

    const determine = () =>
      File.loadFromDatabase(
        this.directory,
        this.prefix,
        this._driver,
        this.internals
      ).then(completedFiles =>
        dbmUtil.filterDown(completedFiles, partialName, count).sort(sortFn)
      );

    if (this.internals.check) {
      return determine()
        .then(toRun => this._checkResult(toRun))
        .nodeify(callback);
    }

    return Promise.resolve(
      this._withLock(determine, toRun => {
        if (toRun.length === 0) {
          log.info(this.title + 'Nothing to run');
        }

        return Promise.each(toRun, file => {
          log.verbose(this.title + 'preparing to run fix:', file.name);
          const _meta = file.get()._meta || {};
          const version = _meta.version || 1;
          if (version < 2) {
            log.warn(`${this.title} skipping "${file.name}" as v1 migrations do not maintain a schema`);
            return Promise.resolve();
          }

          this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
          return Promise.resolve(
            require(`./executors/versioned/v${version}`).fix(
              this,
              this.driver,
              file
            )
          ).catch(failedIn(file));
        });
      })
    ).nodeify(callback);
  },

  _checkResult: function (toRun) {
    if (toRun.length === 0) {
      log.info(this.title + 'Nothing to run');
    }

    const toRunNames = toRun.map(migration => migration.name);
    log.info(this.title + 'run:', toRunNames);
    return toRunNames;
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
