'use strict';

const crypto = require('crypto');
const log = require('db-migrate-shared').log;
const State = require('./state');

/**
 * Background migrations, dml migrations with _meta.background, are not run
 * by up, but registered as jobs. Workers started by executeWork take the
 * jobs one by one and run them. A migration counts as run once its job is
 * done, until then it is running.
 *
 * All jobs live in one row of the state table, changed by compare and swap
 * only, so any number of workers can work on them at once:
 *
 * s: queued, running or failed
 * blocking: later jobs wait until this one is done
 * ID: the worker running it, n: renewed by every write of the worker, a
 *     job whose n does not change for the timeout is taken over
 * step, learned, done, rb: the progress of the run, like for migrations run
 *     in the foreground, see State
 * h: hash of the migration file when it started
 * err: why it failed
 *
 * Migrations take precedence over jobs. Whoever holds the migration lock
 * pauses the jobs before migrating: no job is taken anymore, the running
 * ones stop after their current batch, and are continued once the lock is
 * released. The pause is stored with the jobs, so taking a job and pausing
 * never miss each other. It holds as long as its holder holds the lock.
 */

const JOBS = '__dbmigrate_jobs__';

const nonce = () => crypto.randomBytes(8).toString('hex');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const WAIT = { wait: true };

const read = async (pdriver, internals) => {
  const row = await pdriver._getKV(internals.migrationState, JOBS);
  const state = row ? JSON.parse(row.value) : { jobs: {} };
  return { row, state, jobs: state.jobs };
};

const list = async (pdriver, internals) => (await read(pdriver, internals)).jobs;

/**
 * Changes the jobs by mutate(jobs, state), retried until no other worker
 * wrote in between. mutate returns false to leave them as they are.
 */
const change = async (pdriver, internals, mutate) => {
  for (let attempt = 0; ; attempt++) {
    const { row, state, jobs } = await read(pdriver, internals);

    if (mutate(jobs, state) === false) {
      return jobs;
    }

    state.n = nonce();
    const value = JSON.stringify(state);

    if (!row) {
      try {
        await pdriver._insertKV(internals.migrationState, JOBS, value);
      } catch (err) {
        // inserted by another worker first, try again with theirs
        log.verbose('[jobs] insert failed', err.message);
      }
    } else {
      await pdriver._updateKVC(
        internals.migrationState,
        JOBS,
        value,
        'value',
        row.value
      );
    }

    const after = await pdriver._getKV(internals.migrationState, JOBS);
    if (after && after.value === value) {
      return jobs;
    }

    if (attempt > 50) {
      throw new Error('[jobs] could not change the jobs, too much contention');
    }

    await delay(Math.floor(Math.random() * 20 * Math.min(attempt + 1, 10)));
  }
};

/**
 * Registers a migration as job, or a failed one again. A job which failed
 * with irreversible steps keeps its progress, so it continues after them.
 */
const register = async (pdriver, internals, file) => {
  const blocking = (file.get()._meta || {}).blocking === true;

  await change(pdriver, internals, jobs => {
    const job = jobs[file.name];

    if (job && job.s !== 'failed') {
      return false;
    }

    jobs[file.name] = Object.assign(
      { step: 0, learned: 0, done: 0, rb: 0 },
      job,
      { s: 'queued', blocking, ID: 0, n: nonce(), err: undefined }
    );
  });

  const mig = await pdriver._getKV(internals.migrationState, file.name);
  if (!mig) {
    await pdriver._insertKV(internals.migrationState, file.name, '{}');
  }

  log.info(`[jobs] ${file.name} runs in the background`);
};

/**
 * Whether the jobs are paused by a migration. A pause holds as long as its
 * holder holds the migration lock and keeps it alive, the lock row did not
 * stay the same for the lock timeout, measured on our clock in seen.
 *
 * Resolves to the pause, or null.
 */
const paused = async (pdriver, internals, seen = {}) => {
  const { state } = await read(pdriver, internals);

  if (!state.pause) {
    return null;
  }

  const lock = await State.readLock(pdriver, internals);
  if (!lock || State.holder(lock) !== state.pause.ID) {
    return null;
  }

  const now = Date.now();
  const last = seen.lock;
  if (!last || last.value !== lock.value || String(last.run_on) !== String(lock.run_on)) {
    seen.lock = { value: lock.value, run_on: lock.run_on, since: now };
  } else if (now - last.since >= State.lockOptions(internals).timeout) {
    return null;
  }

  return state.pause;
};

/**
 * Takes the first job to run, in the order of their names. A running job is
 * taken over if it did not change for timeout ms, measured on our clock in
 * seen. Jobs after a blocking job wait until it is done.
 *
 * Resolves to the name of the job taken, null if there is none, or WAIT
 * while the jobs are paused.
 */
const claim = async (pdriver, internals, id, seen, timeout) => {
  const now = Date.now();
  const valid = await paused(pdriver, internals, seen);
  let taken = null;
  let wait = false;

  await change(pdriver, internals, (jobs, state) => {
    taken = null;
    // a pause found invalid before is ignored, one set in between holds
    wait = !!state.pause && (!!valid || state.pause.n !== seen.invalid);
    if (state.pause && !valid) {
      seen.invalid = seen.invalid || state.pause.n;
    }

    if (wait) {
      return false;
    }

    for (const name of Object.keys(jobs).sort()) {
      const job = jobs[name];
      let free = job.s === 'queued';

      if (job.s === 'running' && job.ID !== id) {
        const last = seen[name];

        if (!last || last.n !== job.n) {
          seen[name] = { n: job.n, since: now };
        } else if (now - last.since >= timeout) {
          log.warn(
            `[jobs] taking over ${name}, its worker did not respond for ` +
              `${timeout} ms`
          );
          free = true;
        }
      }

      if (free) {
        Object.assign(job, { s: 'running', ID: id, n: nonce() });
        taken = name;
        return;
      }

      if (job.blocking) {
        return false;
      }
    }

    return false;
  });

  if (wait) {
    return WAIT;
  }

  return taken;
};

const isRunning = (job, id) => job.s === 'running' && job.ID !== id;

/**
 * Pauses the jobs for the migrations of the lock holder id, and waits until
 * the running jobs stopped. A job whose worker does not respond for the lock
 * timeout is not waited for, it is continued by another worker later.
 */
const pause = async (pdriver, internals, id) => {
  const { timeout, interval } = State.lockOptions(internals);
  const seen = {};

  await change(pdriver, internals, (jobs, state) => {
    state.pause = { ID: id, n: nonce() };
  });

  for (;;) {
    const now = Date.now();
    const jobs = await list(pdriver, internals);
    const running = Object.keys(jobs).filter(name => {
      const job = jobs[name];

      if (!isRunning(job, id)) {
        return false;
      }

      const last = seen[name];
      if (!last || last.n !== job.n) {
        seen[name] = { n: job.n, since: now };
        return true;
      }

      return now - last.since < timeout;
    });

    if (!running.length) {
      return;
    }

    log.info(
      `[jobs] waiting for ${running.length} background job(s) to pause: ` +
        running.join(', ')
    );
    // they stop after their current batch, usually soon
    await delay(Math.min(interval, 200));
  }
};

/**
 * Forgets a job, once its migration is reverted.
 */
const remove = (pdriver, internals, name) =>
  change(pdriver, internals, jobs => {
    if (!jobs[name]) {
      return false;
    }

    delete jobs[name];
  });

const resume = (pdriver, internals, id) =>
  change(pdriver, internals, (jobs, state) => {
    if (!state.pause || state.pause.ID !== id) {
      return false;
    }

    delete state.pause;
  });

/**
 * Changes a job we run. If another worker took it over in between, lost is
 * called and nothing is changed.
 */
const update = (pdriver, internals, name, id, mutate, lost = () => {}) =>
  change(pdriver, internals, jobs => {
    const job = jobs[name];

    if (!job || job.ID !== id) {
      lost();
      return false;
    }

    mutate(job, jobs);
    job.n = nonce();
  });

module.exports = { JOBS, WAIT, list, register, claim, update, paused, pause, resume, remove };
