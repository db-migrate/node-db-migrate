'use strict';

const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const log = require('db-migrate-shared').log;
const { FLAG, insertRows } = require('./dml');

/**
 * Static seeds insert data for development and tests, seeds/<name>.js:
 *
 *   exports.seed = async db => {
 *     await db.insert('pets', [{ name: 'Rex' }, { name: 'Tom' }]);
 *   };
 *
 * The rows are flagged with seed:<name> in their __dbmigrate__flag column.
 * Seeding again removes the rows of the previous run first, so seeds can be
 * changed and run any time. The tables each seed inserted into are kept in
 * the state, under SEEDS, in the order the seeds ran.
 */

const SEEDS = '__dbmigrate_seeds__';

const flag = name => `seed:${name}`;

const loadState = async (pdriver, internals) => {
  const row = await pdriver._getKV(internals.migrationState, SEEDS);
  return { exists: !!row, seeds: row ? JSON.parse(row.value) : {} };
};

const saveState = (pdriver, internals, state) => {
  if (internals.dryRun) {
    return Promise.resolve();
  }

  const value = JSON.stringify(state.seeds);

  if (state.exists) {
    return pdriver._updateKV(internals.migrationState, SEEDS, value);
  }

  state.exists = true;
  return pdriver._insertKV(internals.migrationState, SEEDS, value);
};

const columns = (internals, table) => {
  const t = internals.schema.c[table];
  return t ? t.columns || t : null;
};

class SeedDb {
  constructor (driver, internals, name, touch) {
    this.driver = driver;
    this.internals = internals;
    this.name = name;
    this.touch = touch;
  }

  async insert (table, ...args) {
    const { rows } = insertRows(args);
    const known = columns(this.internals, table);

    if (!known || !known[FLAG]) {
      throw new Error(
        `Seed "${this.name}" can not insert into "${table}", seeds insert ` +
          `into tables created by v2 migrations only, by their ${FLAG} ` +
          'column, so the rows can be removed again.'
      );
    }

    if (!rows.length) {
      return;
    }

    await this.touch(table);
    return this.driver.insert(
      table,
      rows.map(row => Object.assign({}, row, { [FLAG]: flag(this.name) }))
    );
  }

  all (...args) {
    return this.driver.all(...args);
  }
}

/**
 * Removes the rows of a seed, the tables in reverse order, for rows
 * referencing rows of the same seed. Tables dropped since are skipped.
 */
const remove = async (driver, internals, state, name) => {
  const tables = (state.seeds[name] || []).slice().reverse();

  await Promise.each(tables, table => {
    if (!columns(internals, table)) {
      return;
    }

    return driver.runSql(
      `DELETE FROM ${driver.escapeDDL(table)} WHERE ${driver.escapeDDL(FLAG)} = ?`,
      [flag(name)]
    );
  });

  delete state.seeds[name];
};

const files = dir => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter(file => /\.js$/.test(file))
    .sort()
    .map(file => ({
      name: file.replace(/\.js$/, ''),
      path: path.join(dir, file)
    }));
};

const select = (list, name, what) => {
  if (!name) {
    return list;
  }

  const found = list.filter(seed => seed.name === name);
  if (!found.length) {
    throw new Error(`There is no ${what} "${name}"`);
  }

  return found;
};

/**
 * Seeds all seeds of the directory, or the one named. The rows of the
 * seeds run before are removed first, of all seeds the last run first,
 * including seeds whose files were removed since.
 */
const run = async (walker, name) => {
  const internals = walker.internals;
  const driver = walker._driver;
  const pdriver = walker._pdriver;
  const dir = path.resolve(internals.argv['seeds-dir']);
  const seeds = select(files(dir), name, 'seed');
  const state = await loadState(pdriver, internals);

  const previous = name ? [name] : Object.keys(state.seeds).reverse();
  await Promise.each(previous, seed => remove(driver, internals, state, seed));
  await saveState(pdriver, internals, state);

  await Promise.each(seeds, async seed => {
    log.info(`[seed] ${seed.name}`);
    delete require.cache[require.resolve(seed.path)];
    const mod = require(seed.path);

    if (typeof mod.seed !== 'function') {
      throw new Error(`The seed "${seed.name}" exports no seed function`);
    }

    state.seeds[seed.name] = [];
    const touch = async table => {
      const tables = state.seeds[seed.name];
      if (tables.indexOf(table) === -1) {
        // recorded before inserting, so a failing seed is removed as well
        tables.push(table);
        await saveState(pdriver, internals, state);
      }
    };

    await mod.seed(new SeedDb(driver, internals, seed.name, touch), {
      options: internals.safeOptions,
      dbm: internals.safeOptions.dbmigrate
    });
    await saveState(pdriver, internals, state);
  });
};

/**
 * Removes the rows of all seeds, or of the one named.
 */
const undo = async (walker, name) => {
  const internals = walker.internals;
  const state = await loadState(walker._pdriver, internals);
  const seeds = name
    ? select(Object.keys(state.seeds).map(n => ({ name: n })), name, 'seeded seed')
    : Object.keys(state.seeds)
      .reverse()
      .map(n => ({ name: n }));

  await Promise.each(seeds, seed => {
    log.info(`[seed] removing ${seed.name}`);
    return remove(walker._driver, internals, state, seed.name);
  });
  await saveState(walker._pdriver, internals, state);
};

module.exports = { run, undo, SEEDS };
