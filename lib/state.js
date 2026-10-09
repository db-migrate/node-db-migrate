const MSTATE = '__dbmigrate_state__';
const SSTATE = '__dbmigrate_schema__';

const log = require('db-migrate-shared').log;
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const ID = crypto.randomBytes(32).toString('base64');

const LOCK_TIMEOUT = 60000;
const LOCK_INTERVAL = 1000;

/**
 * active: a lock session is running, from acquire until release, even if
 *         the lock got lost in between
 * owner: we currently hold the lock
 * current: the last MSTATE row we wrote and verified, the expected
 *          value for our next compare and swap
 * queue: serializes our own writes, so heartbeat and state updates
 *        never race each other on the same expected row
 */
let active = false;
let owner = false;
let current = null;
let heartbeat = null;
let queue = Promise.resolve();

const nonce = () => crypto.randomBytes(8).toString('hex');

const hashFile = async file => {
  if (!file.path) {
    return null;
  }

  try {
    return crypto
      .createHash('sha256')
      .update(await fs.readFile(file.path))
      .digest('hex');
  } catch (err) {
    return null;
  }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const lockOptions = internals => {
  const argv = internals.argv || {};
  return {
    timeout: Number(argv['lock-timeout']) || LOCK_TIMEOUT,
    interval: Number(argv['lock-interval']) || LOCK_INTERVAL
  };
};

const read = (driver, internals) =>
  driver._getKV(internals.migrationState, MSTATE);

const holder = row => JSON.parse(row.value).s.ID;

const heldByOther = row => {
  const id = holder(row);
  return !!id && id !== ID;
};

/**
 * Atomic update of the lock row. The where clause contains the value we
 * have read before, which carries the date and a nonce renewed on every
 * write. If anybody else wrote in between, the update matches no row.
 * Whoever wins, sees his own value on re-read.
 */
const cas = (driver, internals, expected, value) =>
  driver._updateKVC(
    internals.migrationState,
    MSTATE,
    value,
    'value',
    expected.value
  );

/**
 * Concurrent CREATE TABLE IF NOT EXISTS can still collide (e.g. on pg_type
 * in postgres) when several processes start on an empty database. The
 * second attempt finds the table and is a noop.
 */
const createConcurrently = async create => {
  try {
    await create();
  } catch (err) {
    log.verbose('[state] create failed, retrying once', err.message);
    await create();
  }
};

/**
 * The stored schema starts as '{}', keep the structure the walker expects.
 */
const parseSchema = value =>
  Object.assign({ i: {}, c: {}, f: {}, e: {}, d: {} }, JSON.parse(value));

const stopHeartbeat = () => {
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
};

const write = (driver, internals, mutate) => {
  const run = queue.then(async () => {
    if (!owner) {
      throw new Error('[state] the migration lock is not held by this process');
    }

    const state = JSON.parse(current.value);
    Object.assign(state.s, { ID, date: new Date(), n: nonce() });
    mutate(state.s);

    const value = JSON.stringify(state);
    await cas(driver, internals, current, value);
    const row = await read(driver, internals);

    if (!row || row.value !== value) {
      owner = false;
      current = null;
      stopHeartbeat();
      throw new Error('[state] lost the migration lock to another process');
    }

    current = row;
  });

  queue = run.catch(() => {});
  return run;
};

const claim = (row, driver, internals) => {
  if (!row || holder(row) !== ID) {
    return false;
  }

  active = true;
  owner = true;
  current = row;

  const { timeout } = lockOptions(internals);
  heartbeat = setInterval(() => {
    write(driver, internals, () => {}).catch(err => log.error(err.message));
  }, Math.max(Math.floor(timeout / 3), 1));
  heartbeat.unref();

  return true;
};

module.exports = {
  createConcurrently,

  // the id of this process in the lock, the holder of a lock row, see Jobs
  ID,
  holder,
  lockOptions,
  readLock: read,

  // for tests, simulates a process which died while holding the lock
  __stopHeartbeat: stopHeartbeat,

  /**
   * Drivers declare that their state methods were verified for locking,
   * with an atomic _updateKVC and run_on set by the database clock.
   */
  supportsLock: function (driver) {
    return !!(
      driver &&
      driver._meta &&
      driver._meta.supports &&
      driver._meta.supports.locking === true
    );
  },

  /**
   * Try to acquire the migration lock once. Resolves to true if this process
   * is the owner afterwards. A lock held by another process is only taken
   * over, if it is the exact row waitForRelease reported as stale.
   */
  acquire: async function (driver, internals, stale = null, retries = 3) {
    if (owner) {
      return true;
    }

    const row = await read(driver, internals);

    if (!row) {
      try {
        await driver._insertKV(
          internals.migrationState,
          MSTATE,
          JSON.stringify({
            s: { step: 0, fin: 1, ID, date: new Date(), n: nonce() }
          })
        );
      } catch (err) {
        // somebody else inserted the row first, the re-read decides
        log.verbose('[state] lock insert failed', err.message);
      }

      return claim(await read(driver, internals), driver, internals);
    }

    if (heldByOther(row)) {
      if (!stale || stale.value !== row.value) {
        return false;
      }

      const { s } = JSON.parse(row.value);
      log.warn(
        `[state] taking over a stale migration lock from ${s.date}` +
          (s.fin === 0
            ? `, the previous run was interrupted during ${
                s.f ? `migration "${s.f}"` : 'a migration'
              } at step ${s.step}`
            : '')
      );
    }

    const state = JSON.parse(row.value);
    Object.assign(state.s, { ID, date: new Date(), n: nonce() });
    await cas(driver, internals, row, JSON.stringify(state));

    const after = await read(driver, internals);
    if (claim(after, driver, internals)) {
      return true;
    }

    // Nobody holds the lock, still our update did not apply. Either another
    // process acquired and released in between, or the compare and swap does
    // not work with this driver at all, which must not end in a busy loop.
    if (after && !heldByOther(after)) {
      if (retries > 0) {
        return module.exports.acquire(driver, internals, null, retries - 1);
      }

      throw new Error(
        '[state] could not acquire the migration lock although it is free, ' +
          'the driver does not seem to support compare and swap on the state'
      );
    }

    return false;
  },

  /**
   * Wait until the lock is released. A lock whose row did not change for
   * lock-timeout ms is considered stale, its holder is gone. This is
   * measured on our own monotonic clock, so no clocks have to be in sync.
   *
   * Resolves to the stale row, or null if the lock was released properly.
   */
  waitForRelease: async function (driver, internals) {
    const { timeout, interval } = lockOptions(internals);
    let seen = null;
    let since = 0;

    for (;;) {
      const row = await read(driver, internals);

      if (!row || !heldByOther(row)) {
        return null;
      }

      const now = performance.now();
      if (
        !seen ||
        seen.value !== row.value ||
        String(seen.run_on) !== String(row.run_on)
      ) {
        seen = row;
        since = now;
      } else if (now - since >= timeout) {
        return row;
      }

      await delay(interval);
    }
  },

  release: async function (driver, internals) {
    stopHeartbeat();

    if (!owner) {
      active = false;
      return;
    }

    try {
      await write(driver, internals, s => {
        s.ID = 0;
      });
    } catch (err) {
      log.warn(err.message);
    }

    active = false;
    owner = false;
    current = null;
  },

  isOwner: function () {
    return owner;
  },

  init: async function (driver, internals, { emptyState, backupState }) {
    await createConcurrently(() => driver._createKV(internals.migrationState));
    const _schema = await driver._getKV(internals.migrationState, SSTATE);

    if (_schema && backupState) {
      const newName = `${internals.migrationState}_b_${Math.floor((new Date() - 0) / 1000)}`;
      log.info(`[state] Created a backup of ${internals.migrationState} by writing to file ${newName}.dbmigrate`);

      await fs.writeFile(path.resolve(`${newName}.dbmigrate`), JSON.stringify(_schema), 'utf8');

      if (emptyState) {
        await driver.renameTable(internals.migrationState,
          newName);

        log.info(`[state] Created a backup of ${internals.migrationState} by renaming table to ${newName}`);
        await driver._createKV(internals.migrationState);
        await driver._insertKV(internals.migrationState, SSTATE, '{}');
      }
    }

    const schema = emptyState !== true ? _schema : null;
    if (schema) {
      internals.schema = parseSchema(schema.value);
    } else if (!emptyState) {
      try {
        await driver._insertKV(internals.migrationState, SSTATE, '{}');
      } catch (err) {
        // another process initialized the state at the same time
        const row = await driver._getKV(internals.migrationState, SSTATE);
        if (!row) {
          throw err;
        }

        internals.schema = parseSchema(row.value);
      }
    }
  },

  /**
   * Another process may have migrated while we were waiting for the lock,
   * so the schema loaded during init is outdated.
   */
  reloadSchema: async function (driver, internals) {
    const schema = await driver._getKV(internals.migrationState, SSTATE);
    if (schema) {
      internals.schema = parseSchema(schema.value);
    }
  },

  /**
   * Start a migration in the state. With recover, an interrupted previous
   * run of the same migration is not reset but returned, so the caller can
   * decide how to recover:
   *
   * step: the last step started
   * learned: the last step whose reverse operation was recorded
   * done: the last step executed on the database
   * rollback: the run was interrupted while rolling back
   * changed: the migration file changed since
   */
  startMigration: async function (
    driver,
    file,
    internals,
    { op = 'up', recover = false } = {}
  ) {
    const mig = await driver._getKV(internals.migrationState, file.name);

    if (mig && mig.value !== '{}') {
      internals.modSchema = JSON.parse(mig.value);
      // records of older runs, they belong to no step of this run
      (internals.modSchema.s || []).forEach(entry => {
        if (entry.n === undefined) entry.n = 0;
      });
    }

    if (internals.dryRun) {
      return null;
    }

    const h = await hashFile(file);
    const row = await read(driver, internals);
    const prev = row ? JSON.parse(row.value).s : null;

    if (prev && prev.fin === 0 && prev.f) {
      if (recover && prev.f === file.name && prev.o === 'up' && op === 'up') {
        return {
          step: prev.step || 0,
          learned: prev.learned || 0,
          done: prev.done || 0,
          rollback: prev.rb === 1,
          changed: !!prev.h && !!h && prev.h !== h
        };
      }

      log.warn(
        `[state] ignoring the interrupted ${prev.o} of migration ` +
          `"${prev.f}" at step ${prev.step}`
      );
    }

    await module.exports.progress(driver, internals, s => {
      Object.assign(s, {
        step: 0,
        fin: 0,
        f: file.name,
        o: op,
        learned: 0,
        done: 0,
        rb: 0,
        h
      });
    });

    if (!mig) {
      await driver._insertKV(
        internals.migrationState,
        file.name,
        JSON.stringify({})
      );
    }

    return null;
  },

  /**
   * Write migration progress into the lock row. While holding the lock this
   * is a compare and swap, which fails if we lost the lock. Without a lock
   * (driver does not support it) the row is written unconditionally.
   */
  progress: async function (driver, internals, mutate) {
    if (active) {
      return write(driver, internals, mutate);
    }

    const row = await read(driver, internals);
    const state = row
      ? JSON.parse(row.value)
      : { s: { step: 0, fin: 0, ID: 0 } };
    state.s.date = new Date();
    mutate(state.s);

    if (!row) {
      return driver._insertKV(
        internals.migrationState,
        MSTATE,
        JSON.stringify(state)
      );
    }

    return driver._updateKV(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state)
    );
  },

  update: async function (driver, file, state, internals) {
    log.verbose(`[state] update state`);
    if (internals.dryRun) {
      return Promise.resolve();
    }

    await driver._updateKV(internals.migrationState, SSTATE, JSON.stringify(internals.schema));

    return driver._updateKV(
      internals.migrationState,
      file.name,
      JSON.stringify(state)
    );
  },

  get: function (driver, file, internals) {
    return driver._getKV(internals.migrationState, file.name);
  },

  learned: async function (driver, step, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    return module.exports.progress(driver, internals, s => {
      s.learned = step;
    });
  },

  done: async function (driver, step, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    return module.exports.progress(driver, internals, s => {
      s.done = step;
    });
  },

  rollingBack: async function (driver, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    return module.exports.progress(driver, internals, s => {
      s.rb = 1;
    });
  },

  step: async function (driver, step, internals) {
    log.verbose(`[state] proceeded to step ${step}`);
    if (internals.dryRun) {
      return Promise.resolve();
    }

    return module.exports.progress(driver, internals, s => {
      s.step = step;
    });
  },

  deleteState: function (driver, file, internals) {
    return driver._deleteKV(internals.migrationState, file.name);
  },

  endMigration: async function (driver, file, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    // the lock itself stays until the walker releases it
    return module.exports.progress(driver, internals, s => {
      s.fin = 1;
      s.rb = 0;
    });
  }
};
