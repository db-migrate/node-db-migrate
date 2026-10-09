'use strict';

const crypto = require('crypto');
const log = require('db-migrate-shared').log;

/**
 * Releases and the deprecation of tables and columns.
 *
 * A migration starts a release with _meta.release, any label. The releases
 * are counted in the order of the migrations, a migration without a label
 * belongs to the release before it, those before the first label to release
 * 0. The labels themselves are not interpreted.
 *
 * db.deprecateTable and db.deprecateColumn mark a table or column in the
 * release of their migration R. Once a migration starts a later release,
 * db-migrate runs the steps due before it, as a migration of its own named
 * __dbmigrate_release__:<label>:
 *
 * R+1: the table or column is renamed to __dbm_deprecated_<name>_<time>, so
 *      whatever still uses it fails, while the data is still there
 * R+N: it is dropped, N = releases (4 by default), with drop 'auto' only.
 *      With drop 'manual' (default) db-migrate warns it is due, until
 *      db.dropDeprecated drops it.
 *
 * Reverting the first migration of a release reverts the steps run before
 * it as well.
 */

const PREFIX = '__dbmigrate_release__:';
const PURGES = '__dbmigrate_purges__';
const BACKUPS = '__dbmigrate_backups__';
const DEFAULTS = { releases: 4, drop: 'manual' };
const DROPS = ['auto', 'manual'];

/**
 * The release of every migration: { label, index }, by name.
 */
const releases = files => {
  const map = {};
  const index = {};
  let current = { label: null, index: 0 };

  files
    .slice()
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .forEach(file => {
      let label;
      try {
        label = (file.get()._meta || {}).release;
      } catch (err) {
        // an old migration which can not be loaded anymore
        log.verbose(`[release] can not load ${file.name}: ${err.message}`);
      }

      if (label !== undefined && label !== null && String(label) !== current.label) {
        const key = String(label);
        if (index[key] === undefined) {
          index[key] = Object.keys(index).length + 1;
        }

        current = { label: key, index: index[key] };
      }

      map[file.name] = current;
    });

  return { map, index };
};

/**
 * The name a deprecated table or column is renamed to, with the time of the
 * migration deprecating it, so fix learns the same name again.
 */
const hiddenName = (name, file) => {
  const time = String(file.name).split('-')[0];
  const plain = `__dbm_deprecated_${name}_${time}`;

  if (plain.length <= 60) {
    return plain;
  }

  const hash = crypto.createHash('sha256').update(name).digest('hex');
  return `__dbm_deprecated_${hash.slice(0, 16)}_${time}`;
};

const checkOptions = (options = {}) => {
  const out = {};

  if (options.releases !== undefined) {
    const n = Number(options.releases);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(
        `releases is the number of releases until dropping, at least 1, not ${options.releases}`
      );
    }

    out.releases = n;
  }

  if (options.drop !== undefined) {
    if (DROPS.indexOf(options.drop) === -1) {
      throw new Error(`drop is 'auto' or 'manual', not ${options.drop}`);
    }

    out.drop = options.drop;
  }

  return out;
};

/**
 * The options of an entry, given for it, else of the project, else the
 * defaults. The project sets them as deprecation: { releases, drop }, in
 * the rc file or the options of the programmable API.
 */
const settings = (internals, entry) => {
  const project = checkOptions((internals.argv && internals.argv.deprecation) || {});
  return Object.assign({}, DEFAULTS, project, entry.o || {});
};

const entry = (internals, name, options, file) => {
  const e = { r: internals.releaseLabel || null, to: hiddenName(name, file) };
  const o = checkOptions(options);

  if (Object.keys(o).length) {
    e.o = o;
  }

  return e;
};

const columnsOf = (schema, table) => {
  const t = schema.c[table];
  return t ? t.columns || t : null;
};

/**
 * All deprecations with their state:
 *
 * name: the current name, renamed or not
 * renamed: whether it was renamed
 * age: releases since deprecated, up to index
 */
const list = (internals, index, releaseIndex) => {
  const schema = internals.schema;
  const d = schema.d || {};
  const out = [];
  const age = e => index - (e.r === null ? 0 : releaseIndex[e.r] || 0);

  Object.keys(d.tables || {}).forEach(t => {
    const e = d.tables[t];
    const renamed = !!schema.c[e.to];
    if (!renamed && !schema.c[t]) {
      return;
    }

    out.push({ kind: 'tables', t, entry: e, renamed, name: renamed ? e.to : t, age: age(e) });
  });

  Object.keys(d.columns || {}).forEach(t => {
    const columns = columnsOf(schema, t) || {};
    Object.keys(d.columns[t]).forEach(c => {
      const e = d.columns[t][c];
      const renamed = !!columns[e.to];
      if (!renamed && !columns[c]) {
        return;
      }

      out.push({ kind: 'columns', t, c, entry: e, renamed, name: renamed ? e.to : c, age: age(e) });
    });
  });

  return out;
};

const describe = item =>
  item.kind === 'tables'
    ? `table "${item.t}"`
    : `column "${item.c}" of "${item.t}"`;

/**
 * Drops a deprecated table or column and forgets the deprecation, within a
 * v2 migration.
 */
const drop = async (db, item) => {
  if (item.kind === 'tables') {
    await db.dropTable(item.name);
  } else {
    await db.removeColumn(item.t, item.name);
  }

  await db.run('setDeprecated', [item.kind, item.t, item.c || null, null], 'learn');
};

/**
 * The steps due when the release with index starts.
 */
const due = (internals, index, releaseIndex) => {
  const renames = [];
  const drops = [];

  list(internals, index, releaseIndex).forEach(item => {
    const { releases, drop } = settings(internals, item.entry);

    if (item.age >= releases && drop === 'auto') {
      drops.push(item);
    } else if (item.age >= 1 && !item.renamed) {
      renames.push(item);
    }
  });

  return { renames, drops };
};

/**
 * Rows deleted in soft mode with { purge }, to delete for good once enough
 * releases passed: { [mark]: { t, key, r, o } }, stored in the state.
 * Changed by compare and swap, background jobs delete in soft mode as well.
 */
const purges = async (pdriver, internals) => {
  const row = await pdriver._getKV(internals.migrationState, PURGES);
  return { row, value: row ? JSON.parse(row.value) : {} };
};

/**
 * Changes a row of the state by compare and swap, retried until nobody
 * wrote in between. mutate returns false to leave it as it is.
 */
const changeState = async (pdriver, internals, key, mutate) => {
  if (internals.dryRun) {
    return;
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const row = await pdriver._getKV(internals.migrationState, key);
    const value = row ? JSON.parse(row.value) : {};
    if (mutate(value) === false) {
      return;
    }

    const next = JSON.stringify(value);
    if (!row) {
      try {
        await pdriver._insertKV(internals.migrationState, key, next);
      } catch (err) {
        log.verbose(`[release] ${key} inserted concurrently`, err.message);
      }
    } else {
      await pdriver._updateKVC(internals.migrationState, key, next, 'value', row.value);
    }

    const after = await pdriver._getKV(internals.migrationState, key);
    if (after && after.value === next) {
      return;
    }
  }

  throw new Error(`[release] could not change ${key}, too much contention`);
};

const changePurges = (pdriver, internals, mutate) =>
  changeState(pdriver, internals, PURGES, mutate);

/**
 * Schedules purging the rows of a soft delete, { purge: true } takes the
 * options of the project.
 */
const schedulePurge = (pdriver, internals, mark, t, key, purge) => {
  const o = purge === true ? {} : checkOptions(purge);
  const entry = { t, key, r: internals.releaseLabel || null };
  if (Object.keys(o).length) {
    entry.o = o;
  }

  return changePurges(pdriver, internals, value => {
    value[mark] = entry;
  });
};

/**
 * Forgets the purges done, of a soft delete or by db.purge, matching
 * the table and the prefix of the mark.
 */
const forgetPurges = (pdriver, internals, t, prefix) =>
  changePurges(pdriver, internals, value => {
    const marks = Object.keys(value).filter(
      mark => value[mark].t === t && mark.indexOf(prefix) === 0
    );

    if (!marks.length) {
      return false;
    }

    marks.forEach(mark => delete value[mark]);
  });

/**
 * The backup tables of update and delete in copy mode, kept to revert their
 * migration: { [backup]: { m: migration, t: table, r: release } }. Once
 * enough releases passed, the migration is final, its backups are dropped.
 */
const registerBackup = (pdriver, internals, backup, migration, t) =>
  changeState(pdriver, internals, BACKUPS, value => {
    value[backup] = { m: migration, t, r: internals.releaseLabel || null };
  });

const forgetBackups = (pdriver, internals, backups) =>
  changeState(pdriver, internals, BACKUPS, value => {
    if (!backups.some(b => value[b])) {
      return false;
    }

    backups.forEach(b => delete value[b]);
  });

/**
 * The migrations with backups, with their age and options, those due only
 * unless all.
 */
const backupsOf = async (pdriver, internals, index, releaseIndex, all = false) => {
  const row = await pdriver._getKV(internals.migrationState, BACKUPS);
  const value = row ? JSON.parse(row.value) : {};
  const migrations = {};

  Object.keys(value).forEach(backup => {
    const e = value[backup];
    if (!migrations[e.m]) {
      const age = index - (e.r === null ? 0 : releaseIndex[e.r] || 0);
      migrations[e.m] = Object.assign({ m: e.m, age, backups: [] }, settings(internals, e));
    }

    migrations[e.m].backups.push(backup);
  });

  return Object.keys(migrations)
    .map(m => migrations[m])
    .filter(g => all || g.age >= g.releases);
};

/**
 * Drops the backups of a migration, which can not be reverted afterwards:
 * its steps are recorded as irreversible first.
 */
const dropBackups = async (driver, pdriver, internals, group) => {
  log.info(`[release] dropping the backups of ${group.m}, it can not be reverted anymore`);
  if (internals.dryRun) {
    return;
  }

  const row = await pdriver._getKV(internals.migrationState, group.m);
  if (row) {
    const state = JSON.parse(row.value);
    state.s = (state.s || []).map(e =>
      e.t === 4 && group.backups.indexOf(e.c[1]) !== -1
        ? { t: 3, a: e.a, c: [e.c[0]], n: e.n }
        : e
    );
    await pdriver._updateKV(internals.migrationState, group.m, JSON.stringify(state));
  }

  for (const backup of group.backups) {
    await driver.runSql(`DROP TABLE IF EXISTS ${driver.escapeDDL(backup)}`);
  }

  await forgetBackups(pdriver, internals, group.backups);
};

const duePurges = async (pdriver, internals, index, releaseIndex) => {
  const { value } = await purges(pdriver, internals);

  return Object.keys(value).map(mark => {
    const e = value[mark];
    const age = index - (e.r === null ? 0 : releaseIndex[e.r] || 0);
    return Object.assign({ mark, age }, e, settings(internals, e));
  }).filter(e => e.age >= e.releases);
};

const releaseFile = (label, migrate) => ({
  name: PREFIX + label,
  path: null,
  get: () => ({ _meta: { version: 2 }, migrate })
});

/**
 * The walker, without recording the release steps as migrations.
 */
const unrecorded = walker =>
  Object.create(walker, {
    writeMigrationRecord: { value: (file, cb) => cb() },
    deleteMigrationRecord: { value: (file, cb) => cb() }
  });

/**
 * Runs the steps due before the first migration of the release label. fix
 * only learns them again, like the migrations it learns.
 */
const start = async (walker, label, index, releaseIndex, mode = 'up') => {
  const internals = walker.internals;
  const { renames, drops } = due(internals, index, releaseIndex);

  if (mode === 'up') {
    const purged = (
      await duePurges(walker._pdriver, internals, index, releaseIndex)
    ).filter(e => e.drop === 'auto');

    if (purged.length) {
      await purge(walker, label, purged);
    }

    const final = (
      await backupsOf(walker._pdriver, internals, index, releaseIndex)
    ).filter(g => g.drop === 'auto');

    for (const group of final) {
      await dropBackups(walker._driver, walker._pdriver, internals, group);
    }
  }

  if (!renames.length && !drops.length) {
    return;
  }

  log.info(`[release] ${mode === 'fix' ? 'learning' : 'starting'} release ${label}`);
  renames.forEach(item =>
    log.info(`[release] renaming the deprecated ${describe(item)} to ${item.entry.to}`)
  );
  drops.forEach(item => log.info(`[release] dropping the deprecated ${describe(item)}`));

  const file = releaseFile(label, async db => {
    for (const item of renames) {
      if (item.kind === 'tables') {
        await db.renameTable(item.t, item.entry.to);
      } else {
        await db.renameColumn(item.t, item.c, item.entry.to);
      }
    }

    for (const item of drops) {
      await drop(db, item);
    }
  });

  internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
  if (internals.dryRun) {
    return;
  }

  await require('./executors/versioned/v2')[mode](
    unrecorded(walker),
    walker.driver,
    file
  );
};

/**
 * Deletes the rows of the soft deletes due for good, before the first
 * migration of the release label. This can not be reverted, the steps of
 * the release are recorded as irreversible.
 */
const purge = async (walker, label, due) => {
  const internals = walker.internals;
  const pdriver = walker._pdriver;
  const name = PREFIX + label;
  const { Dml, FLAG } = require('./dml');
  const file = releaseFile(label, async () => {});
  const d = new Dml(walker, file, internals, pdriver, null, {
    step: async () => {},
    learned: async () => {},
    done: async () => {}
  });

  for (const e of due) {
    log.info(`[release] purging the rows of "${e.t}" deleted in soft mode by ${e.mark.slice(5)}`);
    if (!internals.dryRun) {
      await d.untilDone(
        e.t,
        e.key,
        { sql: `${d.ddl(FLAG)} LIKE ? ESCAPE '!'`, params: [`%${e.mark.replace(/[!%_]/g, c => '!' + c)}%`] },
        {},
        match => walker._driver.runSql(`DELETE FROM ${d.ddl(e.t)} WHERE ${match.sql}`, match.params)
      );
    }
  }

  if (internals.dryRun) {
    return;
  }

  await changePurges(pdriver, internals, value => {
    due.forEach(e => delete value[e.mark]);
  });

  // the release can not be reverted anymore
  const row = await pdriver._getKV(internals.migrationState, name);
  const state = row ? JSON.parse(row.value) : { i: {}, c: {}, f: {}, s: [] };
  state.s = (state.s || []).concat(
    due.map(e => ({ t: 3, a: 'purge', c: [e.t], n: 0 }))
  );

  if (row) {
    await pdriver._updateKV(internals.migrationState, name, JSON.stringify(state));
  } else {
    await pdriver._insertKV(internals.migrationState, name, JSON.stringify(state));
  }
};

/**
 * Reverts the steps run before the first migration of the release label,
 * once its last migration is reverted.
 */
const revert = async (walker, label) => {
  const internals = walker.internals;
  const name = PREFIX + label;
  const state = await walker._pdriver._getKV(internals.migrationState, name);

  if (!state || internals.dryRun) {
    return;
  }

  log.info(`[release] reverting the steps of release ${label}`);
  internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
  await require('./executors/versioned/v2').down(
    unrecorded(walker),
    walker.driver,
    releaseFile(label, async () => {})
  );
};

/**
 * Refuses reverting a release whose steps can not be reverted, rows purged.
 */
const assertRevertible = async (walker, label) => {
  const row = await walker._pdriver._getKV(
    walker.internals.migrationState,
    PREFIX + label
  );
  const steps = row ? JSON.parse(row.value).s || [] : [];
  const irreversible = steps.filter(entry => entry.t === 3);

  if (irreversible.length) {
    const err = new Error(
      `Release ${label} can not be reverted, it ${irreversible
        .map(entry => `purged "${entry.c[0]}"`)
        .join(', ')} before its first migration.`
    );
    err.irreversible = true;
    throw err;
  }
};

/**
 * Warns about what is due for dropping with drop 'manual'.
 */
const warnDueBackups = async (pdriver, internals, index, releaseIndex) => {
  (await backupsOf(pdriver, internals, index, releaseIndex))
    .filter(g => g.drop === 'manual')
    .forEach(g =>
      log.warn(
        `[release] the backups of ${g.m} are due for dropping, it ran ` +
          `${g.age} releases ago. Drop them in a dml migration with ` +
          `db.dropBackups(${JSON.stringify(g.m)}), it can not be reverted ` +
          'afterwards.'
      )
    );
};

const warnDuePurges = async (pdriver, internals, index, releaseIndex) => {
  (await duePurges(pdriver, internals, index, releaseIndex))
    .filter(e => e.drop === 'manual')
    .forEach(e =>
      log.warn(
        `[release] the rows of "${e.t}" deleted in soft mode by ` +
          `${e.mark.slice(5)} are due for purging, deleted ${e.age} releases ` +
          `ago. Purge them in a dml migration with db.purge(${JSON.stringify(e.t)}, ` +
          `${JSON.stringify(e.mark.slice(5, e.mark.lastIndexOf('#')))}).`
      )
    );
};

const warnDue = (internals, index, releaseIndex) => {
  list(internals, index, releaseIndex).forEach(item => {
    const { releases, drop } = settings(internals, item.entry);

    if (drop === 'manual' && item.age >= releases) {
      log.warn(
        `[release] the deprecated ${describe(item)} is due for dropping, ` +
          `deprecated ${item.age} releases ago. Drop it in a migration with ` +
          `db.dropDeprecated(${JSON.stringify(item.t)}${
            item.c ? `, ${JSON.stringify(item.c)}` : ''
          }).`
      );
    }
  });
};

module.exports = {
  PREFIX,
  PURGES,
  BACKUPS,
  registerBackup,
  forgetBackups,
  backupsOf,
  dropBackups,
  warnDueBackups,
  schedulePurge,
  forgetPurges,
  warnDuePurges,
  releases,
  entry,
  list,
  settings,
  drop,
  start,
  revert,
  assertRevertible,
  warnDue,
  columnsOf
};
