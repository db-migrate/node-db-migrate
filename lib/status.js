'use strict';

const dbmUtil = require('db-migrate-shared').util;
const File = require('./file');
const State = require('./state');
const Jobs = require('./jobs');
const Release = require('./release');

/**
 * What db-migrate knows about the database, without changing anything:
 *
 * pending: migrations not run yet, background migrations running excluded
 * lock: the process holding the migration lock, and the migration it was
 *       interrupted in, if any
 * jobs: the jobs of background migrations, paused by whom if so
 * release: the latest release migrated
 * deprecated: tables and columns deprecated, renamed or not, and when due
 * purges, backups: soft deletes and backups due
 */
module.exports = async function status (walker) {
  const internals = walker.internals;
  const pdriver = walker._pdriver;
  const supports = State.supportsLock(pdriver);

  const [allFiles, completed] = await Promise.all([
    File.loadFromFileystem(walker.directory, walker.prefix, internals).catch(err => {
      if (err.code === 'ENOENT') {
        return [];
      }

      throw err;
    }),
    File.loadFromDatabase(walker.directory, walker.prefix, walker._driver, internals)
  ]);

  walker._releases(allFiles, completed);
  const release = walker._release;
  const index = walker._applied;

  const jobs = supports ? await Jobs.list(pdriver, internals) : {};
  const pending = dbmUtil
    .filterUp(allFiles, completed, undefined, Number.MAX_VALUE)
    .filter(file => !jobs[file.name] || jobs[file.name].s === 'failed')
    .map(file => file.name);

  const result = {
    pending,
    lock: null,
    jobs: [],
    paused: null,
    release: null,
    deprecated: [],
    purges: [],
    backups: []
  };

  const labels = Object.keys(release.index);
  result.release = labels.find(label => release.index[label] === index) || null;

  if (supports) {
    const lock = await State.readLock(pdriver, internals);
    if (lock) {
      const s = JSON.parse(lock.value).s;
      result.lock = {
        held: !!s.ID,
        since: s.date,
        interrupted: s.fin === 0 && s.f ? { migration: s.f, op: s.o, step: s.step, done: s.done } : null
      };
    }

    const paused = await Jobs.paused(pdriver, internals);
    result.paused = paused ? paused.ID : null;
    result.jobs = Object.keys(jobs)
      .sort()
      .map(name => {
        const job = jobs[name];
        return {
          name,
          state: job.s,
          blocking: !!job.blocking,
          step: job.step,
          done: job.done,
          error: job.err || null
        };
      });

    const due = (e, age) => {
      const options = Release.settings(internals, e);
      return Object.assign({ age, due: age >= options.releases }, options);
    };

    result.deprecated = Release.list(internals, index, release.index).map(item =>
      Object.assign(
        {
          table: item.t,
          column: item.c || null,
          name: item.name,
          renamed: item.renamed,
          release: item.entry.r
        },
        due(item.entry, item.age)
      )
    );

    const purges = await pdriver._getKV(internals.migrationState, Release.PURGES);
    const scheduled = purges ? JSON.parse(purges.value) : {};
    result.purges = Object.keys(scheduled).map(mark => {
      const e = scheduled[mark];
      const age = index - (e.r === null ? 0 : release.index[e.r] || 0);
      return Object.assign({ table: e.t, by: mark.slice(5), release: e.r }, due(e, age));
    });

    result.backups = (
      await Release.backupsOf(pdriver, internals, index, release.index, true)
    ).map(g => ({
      migration: g.m,
      tables: g.backups,
      age: g.age,
      due: g.age >= g.releases,
      releases: g.releases,
      drop: g.drop
    }));
  }

  return result;
};

/**
 * The status as text, for the command line.
 */
module.exports.format = s => {
  const lines = [];
  const section = (title, items, line) => {
    lines.push(`${title}:${items.length ? '' : ' none'}`);
    items.forEach(item => lines.push(`  ${line(item)}`));
  };

  section('Pending migrations', s.pending, name => name);
  lines.push(`Release: ${s.release === null ? 'none' : s.release}`);

  if (s.lock) {
    lines.push(
      `Migration lock: ${s.lock.held ? `held since ${s.lock.since}` : 'free'}` +
        (s.lock.interrupted
          ? `, ${s.lock.interrupted.op} of ${s.lock.interrupted.migration} ` +
            `interrupted at step ${s.lock.interrupted.step}`
          : '')
    );
  }

  section(
    `Background jobs${s.paused ? ' (paused for migrations)' : ''}`,
    s.jobs,
    job =>
      `${job.name}: ${job.state}${job.blocking ? ', blocking' : ''}` +
      (job.step ? `, step ${job.step}, ${job.done} done` : '') +
      (job.error ? `, ${job.error}` : '')
  );
  section(
    'Deprecated',
    s.deprecated,
    d =>
      `${d.column ? `column "${d.column}" of "${d.table}"` : `table "${d.table}"`}` +
      `${d.renamed ? ` renamed to ${d.name}` : ''}, ${d.age} of ${d.releases} ` +
      `releases${d.due ? `, due to drop (${d.drop})` : ''}`
  );
  section(
    'Purges',
    s.purges,
    p => `"${p.table}" by ${p.by}, ${p.age} of ${p.releases} releases${p.due ? `, due (${p.drop})` : ''}`
  );
  section(
    'Backups',
    s.backups,
    b => `${b.migration}: ${b.tables.length} table(s), ${b.age} of ${b.releases} releases${b.due ? `, due (${b.drop})` : ''}`
  );

  return lines.join('\n');
};
