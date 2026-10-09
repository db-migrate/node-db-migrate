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
 * The name a deprecated table or column is renamed to.
 */
const hiddenName = name => {
  const time = Math.floor(Date.now() / 1000);
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

const entry = (internals, name, options) => {
  const e = { r: internals.releaseLabel || null, to: hiddenName(name) };
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
 * Runs the steps due before the first migration of the release label.
 */
const start = async (walker, label, index, releaseIndex) => {
  const internals = walker.internals;
  const { renames, drops } = due(internals, index, releaseIndex);

  if (!renames.length && !drops.length) {
    return;
  }

  log.info(`[release] starting release ${label}`);
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

  await require('./executors/versioned/v2').up(unrecorded(walker), walker.driver, file);
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
 * Warns about what is due for dropping with drop 'manual'.
 */
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
  releases,
  entry,
  list,
  settings,
  drop,
  start,
  revert,
  warnDue,
  columnsOf
};
