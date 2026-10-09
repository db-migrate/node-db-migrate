'use strict';

const crypto = require('crypto');
const path = require('path');
const Promise = require('bluebird');
const log = require('db-migrate-shared').log;
const State = require('./state');
const File = require('./file');
const Jobs = require('./jobs');
const Dml = require('./dml');

/**
 * Runs the jobs of background migrations, see Jobs.
 *
 * parallel: jobs run at once by this worker, each on connections of its own
 * pause: ms to wait between two batches of a job
 * batch: rows per batch, unless the instruction sets its own
 * interval: ms between looking for new jobs
 * timeout: ms after which a job of a worker which stopped responding is
 *          taken over, the heartbeat renews it every third of it
 * watch: keep looking for new jobs, instead of ending once none is left
 *
 * Returns { done, stop }. done resolves with the jobs done and failed, once
 * no job is left, or after stop() was called. stop() lets the running jobs
 * stop after their current batch, they are continued later.
 */

const DEFAULTS = {
  parallel: 1,
  pause: 0,
  batch: undefined,
  interval: 5000,
  timeout: 60000,
  watch: false
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const connect = async (internals, config) => {
  const Migrator = require('./walker');
  const index = require('../connect');

  const walker = await index.connect(
    {
      config: config.getCurrent().settings,
      internals,
      prefix: 'migration'
    },
    Migrator
  );

  walker.directory = path.resolve(internals.argv['migrations-dir']);
  await walker.createMigrationsTable();

  if (!State.supportsLock(walker._pdriver)) {
    walker.driver.close(() => {});
    throw new Error(
      'Background migrations need a driver supporting the migration lock'
    );
  }

  return walker;
};

const close = walker =>
  new Promise(resolve => walker.driver.close(() => resolve()));

/**
 * The interrupted run of a job, like State.startMigration reports it.
 */
const interruption = (job, hash) =>
  job.step > 0
    ? {
      step: job.step,
      learned: job.learned,
      done: job.done,
      rollback: job.rb === 1,
      changed: !!job.h && !!hash && job.h !== hash
    }
    : null;

const hashFile = file =>
  crypto
    .createHash('sha256')
    .update(require('fs').readFileSync(file.path))
    .digest('hex');

const runJob = async (walker, name, id, options, stopping, result) => {
  const internals = walker.internals;
  const pdriver = walker._pdriver;
  let lost = false;
  const update = mutate =>
    Jobs.update(pdriver, internals, name, id, mutate, () => {
      lost = true;
    });

  const files = await File.loadFromFileystem(
    walker.directory,
    walker.prefix,
    internals
  );
  const file = files.find(f => f.name === name);

  if (!file) {
    await update(job => {
      job.s = 'failed';
      job.ID = 0;
      job.err = 'the migration file is missing';
    });
    throw new Error(`The migration file of the job ${name} is missing`);
  }

  const heartbeat = setInterval(() => {
    update(() => {}).catch(err => log.error(err.message));
  }, Math.max(Math.floor(options.timeout / 3), 1));
  heartbeat.unref();

  try {
    const jobs = await Jobs.list(pdriver, internals);
    const hash = hashFile(file);
    const interrupted = interruption(jobs[name], hash);

    await State.reloadSchema(pdriver, internals);
    const mig = await pdriver._getKV(internals.migrationState, name);
    internals.modSchema = Object.assign(
      { i: {}, c: {}, f: {}, s: [] },
      mig ? JSON.parse(mig.value) : {}
    );

    if (!interrupted) {
      await update(job => {
        job.h = hash;
      });
    }

    log.info(
      `[jobs] ${interrupted ? 'continuing' : 'running'} ${name}`
    );

    const progress = {
      step: op => update(job => { job.step = op; }),
      learned: op => update(job => { job.learned = op; }),
      done: op => update(job => { job.done = op; })
    };

    await Dml.execute(
      walker,
      file,
      internals,
      pdriver,
      interrupted,
      progress,
      {
        batch: options.batch,
        pause: options.pause,
        stopping: () => lost || stopping()
      },
      {
        rollingBack: () => update(job => { job.rb = 1; }),
        restart: () =>
          update(job => {
            Object.assign(job, { step: 0, learned: 0, done: 0, rb: 0, h: hash });
          })
      }
    );

    await Promise.promisify(walker.writeMigrationRecord.bind(walker))(file);
    await update((job, jobs) => {
      delete jobs[name];
    });
    log.info(`[jobs] ${name} is done`);
    result.done.push(name);
  } catch (err) {
    if (lost) {
      log.warn(`[jobs] ${name} was taken over by another worker`);
      return;
    }

    if (err && err.stopped) {
      await update(job => {
        job.s = 'queued';
        job.ID = 0;
      });
      log.info(`[jobs] ${name} stopped, it continues with the next run`);
      return;
    }

    // a job rolled back starts over, else it continues after the steps
    // which can not be reverted
    await update(job => {
      job.s = 'failed';
      job.ID = 0;
      job.err = (err && err.message) || String(err);
      if (err && err.rolledBack) {
        Object.assign(job, { step: 0, learned: 0, done: 0, rb: 0 });
      }
    });
    log.error(`[jobs] ${name} failed: ${(err && err.message) || err}`);
    result.failed.push({ name, error: err });
  } finally {
    clearInterval(heartbeat);
  }
};

module.exports = function executeWork (internals, config, opts = {}) {
  const options = Object.assign({}, DEFAULTS, opts);
  const id = crypto.randomBytes(16).toString('base64');
  const seen = {};
  const result = { done: [], failed: [] };
  let stopped = false;
  const stopping = () => stopped;

  const slot = async () => {
    // internals of its own, each slot migrates on its own connections
    const own = Object.assign({}, internals, {
      argv: Object.assign({}, internals.argv)
    });
    const walker = await connect(own, config);

    try {
      while (!stopping()) {
        const name = await Jobs.claim(
          walker._pdriver,
          own,
          id,
          seen,
          options.timeout
        );

        if (name) {
          await runJob(walker, name, id, options, stopping, result);
          continue;
        }

        if (!options.watch) {
          return;
        }

        await delay(options.interval);
      }
    } finally {
      await close(walker);
    }
  };

  const slots = [];
  for (let i = 0; i < Math.max(Number(options.parallel) || 1, 1); i++) {
    slots.push(slot());
  }

  const done = Promise.all(slots).then(() => result);

  return {
    done,
    stop: () => {
      stopped = true;
      return done;
    }
  };
};
