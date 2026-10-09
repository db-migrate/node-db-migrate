'use strict';

const dbmUtil = require('db-migrate-shared').util;
const State = require('./state');
const log = require('db-migrate-shared').log;
const Promise = require('bluebird');
const File = require('./file.js');
const Dml = require('./dml');
const Jobs = require('./jobs');
const Release = require('./release');

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
  this.internals.schema = { i: {}, c: {}, f: {}, e: {}, d: {} };
  /**
   * s: commands
   * i: index
   * f: foreignKey
   * c: schema
   */
  this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
  // the state of an earlier run of the same instance of the API, e.g. a
  // down leaves unlearn set, which would keep up from recording anything
  this.internals.unlearn = false;
  this.internals.rollback = false;
  this.internals.rollbackContinue = false;
  this.internals.learnFromScratch = false;
  this.mode = mode;

  if (!this.mode) this.prefix = `static-${prefix}`;
  else this.prefix = prefix;

  this.title = `[${prefix}] `;

  // keep it until we decide how we do the cross linking
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

    let paused = false;
    try {
      // migrations take precedence over the jobs of background migrations
      await Jobs.pause(this._pdriver, this.internals, State.ID);
      paused = true;
      await State.reloadSchema(this._pdriver, this.internals);
      return await run(await determine());
    } finally {
      if (paused) {
        await Jobs.resume(this._pdriver, this.internals, State.ID).catch(err =>
          log.warn(`[jobs] could not resume the jobs: ${err.message}`)
        );
      }

      await State.release(this._pdriver, this.internals);
    }
  },

  /**
   * Migrations running in the background are left out, until their job is
   * done. Failed ones are run, which registers them again.
   */
  _withoutJobs: async function (toRun) {
    if (this.prefix !== 'migration' || !this._pdriver || typeof this._pdriver._getKV !== 'function') {
      return toRun;
    }

    const jobs = await Jobs.list(this._pdriver, this.internals);

    return toRun.filter(file => {
      const job = jobs[file.name];

      if (job && job.s !== 'failed') {
        log.info(`${this.title}${file.name} is running in the background`);
        return false;
      }

      return true;
    });
  },

  /**
   * The migrations of the jobs, newest first.
   */
  _jobFiles: async function () {
    if (this.prefix !== 'migration' || !this._pdriver || typeof this._pdriver._getKV !== 'function') {
      return [];
    }

    const jobs = await Jobs.list(this._pdriver, this.internals);
    const names = Object.keys(jobs);
    if (!names.length) {
      return [];
    }

    const files = await File.loadFromFileystem(this.directory, this.prefix, this.internals);
    return names
      .sort()
      .reverse()
      .map(name => {
        const file = files.find(f => f.name === name);
        if (!file) {
          throw new Error(
            `The migration of the background job "${name}" is missing, it ` +
              'can not be reverted'
          );
        }

        file.job = true;
        return file;
      });
  },

  /**
   * Reverts what the job of a background migration did so far, it was
   * paused by taking the lock, and forgets the job.
   */
  _revertJob: async function (file) {
    log.info(`${this.title}reverting the background job of ${file.name}`);
    this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };

    if (!this.internals.dryRun) {
      await Dml.down(this, this.driver, file);
      await Jobs.remove(this._pdriver, this.internals, file.name);
    }
  },

  _registerJob: async function (file) {
    Dml.checkType(file);

    if (this.internals.dryRun) {
      log.info(`${this.title}${file.name} would run in the background`);
      return;
    }

    if (!State.supportsLock(this._pdriver)) {
      throw new Error(
        'Background migrations need a driver supporting the migration lock'
      );
    }

    return Jobs.register(this._pdriver, this.internals, file);
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
      ])
        .spread((allFiles, completedFiles) => {
          this._releases(allFiles, completedFiles);
          return dbmUtil.filterUp(allFiles, completedFiles, partialName, count);
        })
        .then(toRun => this._withoutJobs(toRun));

    if (this.internals.check) {
      return determine()
        .then(async toRun => {
          await this._warnDue();
          return this._checkResult(toRun);
        })
        .nodeify(callback);
    }

    return Promise.resolve(
      this._withLock(determine, toRun => {
        if (toRun.length === 0) {
          log.info(this.title + 'Nothing to run');
        }

        return Promise.each(toRun, async file => {
          log.verbose(this.title + 'preparing to run up:', file.name);
          await this._enterRelease(file).catch(failedIn(file));

          if (Dml.isBackground(file)) {
            return this._registerJob(file).catch(failedIn(file));
          }

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
        }).then(async res => {
          await this._warnDue();
          return res;
        });
      })
    ).nodeify(callback);
  },

  /**
   * The releases of the migrations, and the latest release migrated.
   */
  _releases: function (allFiles, completedFiles) {
    const release = Release.releases(allFiles);
    this._release = release;
    this._applied = completedFiles.reduce(
      (max, file) => Math.max(max, (release.map[file.name] || { index: 0 }).index),
      0
    );
  },

  /**
   * Runs the steps due, before the first migration of a new release.
   */
  _enterRelease: async function (file, mode = 'up') {
    const release = this._release || { map: {}, index: {} };
    const r = release.map[file.name] || { label: null, index: 0 };

    if (r.index > this._applied) {
      this.internals.releaseIndex = release.index;
      await Release.start(this, r.label, r.index, release.index, mode);
      this._applied = r.index;
    }

    this.internals.releaseLabel = r.label;
    this.internals.releaseIndex = release.index;
    this.internals.releaseCurrent = this._applied;
  },

  /**
   * The label of the release whose steps are reverted after reverting file,
   * its last migration. Refuses before reverting anything, if the steps of
   * the release can not be reverted.
   */
  _leavingRelease: async function (file) {
    const release = this._release;
    const r = release && release.map[file.name];

    if (!r || !r.label) {
      return null;
    }

    const completed = await File.loadFromDatabase(
      this.directory,
      this.prefix,
      this._driver,
      this.internals
    );
    const remaining = completed
      .filter(f => f.name !== file.name)
      .reduce(
        (max, f) => Math.max(max, (release.map[f.name] || { index: 0 }).index),
        0
      );

    if (remaining >= r.index) {
      return null;
    }

    await Release.assertRevertible(this, r.label);
    return r.label;
  },

  _warnDue: async function () {
    if (!this._release) {
      return;
    }

    Release.warnDue(this.internals, this._applied, this._release.index);
    if (this._pdriver && typeof this._pdriver._getKV === 'function') {
      await Release.warnDuePurges(
        this._pdriver,
        this.internals,
        this._applied,
        this._release.index
      );
      await Release.warnDueBackups(
        this._pdriver,
        this.internals,
        this._applied,
        this._release.index
      );
    }
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
      ).then(async completedFiles => {
        // the releases, from the migrations still there
        const allFiles = await File.loadFromFileystem(
          this.directory,
          this.prefix,
          this.internals
        ).catch(err => {
          if (err.code === 'ENOENT') {
            return [];
          }

          throw err;
        });
        this._releases(allFiles, completedFiles);

        return dbmUtil.filterDown(
          // jobs of background migrations are the latest, still running
          (await this._jobFiles()).concat(completedFiles),
          partialName,
          count
        );
      });

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
          if (file.job) {
            return this._revertJob(file).catch(failedIn(file));
          }

          const _meta = file.get()._meta || {};
          const version = _meta.version || 1;
          this.internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
          return this._leavingRelease(file)
            .then(leaving =>
              require(`./executors/versioned/v${version}`)
                .down(this, this.driver, file)
                .then(() => leaving && Release.revert(this, leaving))
            )
            .catch(failedIn(file));
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
      ).then(async completedFiles => {
        // the releases, learned again from the start
        const allFiles = await File.loadFromFileystem(
          this.directory,
          this.prefix,
          this.internals
        ).catch(err => {
          if (err.code === 'ENOENT') {
            return [];
          }

          throw err;
        });
        this._releases(allFiles, []);

        return dbmUtil.filterDown(completedFiles, partialName, count).sort(sortFn);
      });

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

        return Promise.each(toRun, async file => {
          log.verbose(this.title + 'preparing to run fix:', file.name);
          await this._enterRelease(file, 'fix').catch(failedIn(file));
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
