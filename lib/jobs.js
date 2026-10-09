'use strict';

const crypto = require('crypto');
const log = require('db-migrate-shared').log;

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
 */

const JOBS = '__dbmigrate_jobs__';

const nonce = () => crypto.randomBytes(8).toString('hex');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const read = async (pdriver, internals) => {
  const row = await pdriver._getKV(internals.migrationState, JOBS);
  return { row, jobs: row ? JSON.parse(row.value).jobs : {} };
};

const list = async (pdriver, internals) => (await read(pdriver, internals)).jobs;

/**
 * Changes the jobs by mutate, retried until no other worker wrote in
 * between. mutate returns false to leave them as they are.
 */
const change = async (pdriver, internals, mutate) => {
  for (let attempt = 0; ; attempt++) {
    const { row, jobs } = await read(pdriver, internals);

    if (mutate(jobs) === false) {
      return jobs;
    }

    const value = JSON.stringify({ jobs, n: nonce() });

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
 * Takes the first job to run, in the order of their names. A running job is
 * taken over if it did not change for timeout ms, measured on our clock in
 * seen. Jobs after a blocking job wait until it is done.
 *
 * Resolves to the name of the job taken, or null.
 */
const claim = async (pdriver, internals, id, seen, timeout) => {
  const now = Date.now();
  let taken = null;

  await change(pdriver, internals, jobs => {
    taken = null;

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

  return taken;
};

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

module.exports = { JOBS, list, register, claim, update };
