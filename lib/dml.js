'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const log = require('db-migrate-shared').log;
const State = require('./state');
const { recoveryMode, describeFailure } = require('./recovery');

/**
 * DML migrations, _meta: { version: 2, type: 'dml' }, change data instead of
 * the schema. Every instruction is a step, recorded with what reverts it:
 *
 * insert: the rows get the step in their __dbmigrate__flag column, reverting
 *         deletes the rows flagged with it
 * update, delete: the rows are copied to a backup table in the same database
 *         first, reverting restores them from there. The rows are then
 *         changed in batches by their key, the progress is kept in the
 *         state, so an interrupted run continues where it stopped.
 * runSql: reverted by the SQL given with { revert }
 *
 * The records are { t: 4, a: action, c: args }, or { t: 3 } for a step run
 * with { irreversible: true }, which can not be reverted.
 */

const FLAG = '__dbmigrate__flag';
const BATCH = 1000;
const TYPES = ['dml'];

const SCHEMA_INSTRUCTIONS = [
  'createTable',
  'dropTable',
  'renameTable',
  'addColumn',
  'removeColumn',
  'renameColumn',
  'changeColumn',
  'addIndex',
  'removeIndex',
  'addForeignKey',
  'removeForeignKey',
  'createCollection',
  'dropCollection',
  'renameCollection'
];

const isDml = file => (file.get()._meta || {}).type === 'dml';

const checkType = file => {
  const type = (file.get()._meta || {}).type;

  if (type !== undefined && TYPES.indexOf(type) === -1) {
    throw new Error(
      `Invalid migration type "${type}" in migration "${file.name}", use ` +
        TYPES.join(', ') +
        ' or leave it out for a schema migration'
    );
  }
};

const backupName = (file, op) =>
  '__dbm_backup_' +
  crypto
    .createHash('sha256')
    .update(`${file.name}#${op}`)
    .digest('hex')
    .slice(0, 16);

const isObject = x =>
  x !== null &&
  typeof x === 'object' &&
  !Array.isArray(x) &&
  !(x instanceof Date) &&
  !Buffer.isBuffer(x);

// like db-migrate-base, objects and arrays are stored as JSON
const toValue = value => {
  if (
    value !== null &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value)
  ) {
    return JSON.stringify(value);
  }

  return value === undefined ? null : value;
};

/**
 * The rows of an insert as objects, from any form db-migrate-base takes,
 * and the options following them.
 */
const insertRows = args => {
  if (Array.isArray(args[0]) && Array.isArray(args[1])) {
    const [columns, values, options = {}] = args;
    const rows =
      !values.length || Array.isArray(values[0]) ? values : [values];

    return {
      options,
      rows: rows.map(row => {
        if (!Array.isArray(row) || row.length !== columns.length) {
          throw new Error(
            'The number of columns does not match the number of values.'
          );
        }

        const object = {};
        columns.forEach((column, i) => {
          object[column] = row[i];
        });
        return object;
      })
    };
  }

  const [data, options = {}] = args;

  if (isObject(data) && Array.isArray(data.columns)) {
    const values = [];
    for (let i = 0; i < data.data.length; i += data.columns.length) {
      values.push(data.data.slice(i, i + data.columns.length));
    }

    return insertRows([data.columns, values, options]);
  }

  if (isObject(data)) {
    return { rows: [data], options };
  }

  if (Array.isArray(data) && data.every(isObject)) {
    return { rows: data, options };
  }

  throw new Error('insert needs the rows to insert');
};

class Dml {
  constructor (context, file, internals, pdriver, recovery) {
    this.driver = context._driver;
    this.file = file;
    this.internals = internals;
    this.pdriver = pdriver;
    this.recovery = recovery;
    this.op = 0;
    this.current = null;

    SCHEMA_INSTRUCTIONS.forEach(method => {
      this[method] = () => {
        throw new Error(
          `${method} is a schema instruction, which dml migrations do not ` +
            'allow. Change the schema in a v2 migration of its own.'
        );
      };
    });
  }

  ddl (name) {
    return this.driver.escapeDDL(name);
  }

  columns (table) {
    const t = this.internals.schema.c[table];
    return t ? t.columns || t : null;
  }

  /**
   * The key of a table, to change and restore its rows by. Taken from the
   * schema, for other tables it is passed with { key }.
   */
  key (table, options, action) {
    if (options.key) {
      return [].concat(options.key);
    }

    const columns = this.columns(table) || {};
    const key = Object.keys(columns).filter(c => columns[c].primaryKey);

    if (!key.length) {
      throw new Error(
        `${action}("${table}") needs the primary key of "${table}" to revert ` +
          'it, which is unknown to the schema of db-migrate. Pass it with ' +
          "{ key: 'id' }, or pass { irreversible: true } to change the rows " +
          'without being able to revert it.'
      );
    }

    return key;
  }

  where (where) {
    if (typeof where === 'string') {
      return { sql: where, params: [] };
    }

    if (Array.isArray(where) && typeof where[0] === 'string') {
      return { sql: where[0], params: where[1] || [] };
    }

    if (isObject(where)) {
      const params = [];
      const parts = Object.keys(where).map(column => {
        const value = where[column];

        if (value === null || value === undefined) {
          return `${this.ddl(column)} IS NULL`;
        }

        if (Array.isArray(value)) {
          if (!value.length) {
            return '1 = 0';
          }

          params.push(...value.map(toValue));
          return `${this.ddl(column)} IN (${value.map(() => '?').join(', ')})`;
        }

        params.push(toValue(value));
        return `${this.ddl(column)} = ?`;
      });

      return { sql: parts.length ? parts.join(' AND ') : '1 = 1', params };
    }

    throw new Error(
      "where is an object like { status: 'old' }, a SQL string or " +
        '[sql, params]'
    );
  }

  // matches the rows by their key
  byKey (rows, key) {
    const params = [];

    if (key.length === 1) {
      rows.forEach(row => params.push(row[key[0]]));
      return {
        sql: `${this.ddl(key[0])} IN (${rows.map(() => '?').join(', ')})`,
        params
      };
    }

    const sql = rows
      .map(row => {
        key.forEach(k => params.push(row[k]));
        return '(' + key.map(k => `${this.ddl(k)} = ?`).join(' AND ') + ')';
      })
      .join(' OR ');

    return { sql, params };
  }

  /**
   * Runs one instruction as a step: records what reverts it, executes it and
   * records it as done. The step of an interrupted run is continued, with
   * the record it left.
   */
  async step (action, args, record, execute) {
    const op = ++this.op;
    const internals = this.internals;
    const mod = internals.modSchema;
    const recovery = this.recovery;
    this.current = `${action}(${args.map(a => JSON.stringify(a)).join(', ')})`;
    internals.migrationOp = op;

    if (recovery && op <= recovery.done) {
      log.info(
        `[recovery] ${this.file.name}: skipping already executed step ` +
          `${op}/${recovery.done} ${this.current}`
      );
      return;
    }

    await State.step(this.pdriver, op, internals);

    let entry = recovery && op <= recovery.learned
      ? mod.s.find(e => e.n === op)
      : null;

    if (entry) {
      log.info(
        `[recovery] ${this.file.name}: continuing interrupted step ${op} ` +
          this.current
      );
    } else {
      mod.s = mod.s.filter(e => e.n !== op);
      entry = record(op);
      entry.n = op;
      mod.s.push(entry);
      await State.update(this.pdriver, this.file, mod, internals);
      await State.learned(this.pdriver, op, internals);
    }

    await execute(entry, op);

    internals.migrationDone = op;
    await State.done(this.pdriver, op, internals);
  }

  save () {
    return State.update(
      this.pdriver,
      this.file,
      this.internals.modSchema,
      this.internals
    );
  }

  /**
   * insert(table, rows, [options]), rows in any form of the SQL API insert.
   */
  insert (table, ...args) {
    const { rows, options } = insertRows(args);
    const irreversible = options.irreversible === true;

    if (!irreversible) {
      const columns = this.columns(table);

      if (!columns || !columns[FLAG]) {
        throw new Error(
          `insert("${table}") can only be reverted for tables created by v2 ` +
            `migrations, by their ${FLAG} column` +
            (columns ? `, which "${table}" does not have` : '') +
            '. Pass { irreversible: true } to insert the rows without being ' +
            'able to revert it.'
        );
      }

      if (typeof this.driver._insertGroups !== 'function') {
        throw new Error(
          'dml migrations need db-migrate-base 2.5.0 or newer, update your ' +
            'driver'
        );
      }
    }

    return this.step(
      'insert',
      [table],
      op =>
        irreversible
          ? { t: 3, a: 'insert', c: [table] }
          : { t: 4, a: 'insert', c: [table, `${this.file.name}#${op}`] },
      async entry => {
        if (!rows.length) {
          return;
        }

        if (irreversible) {
          return this.driver.insert(table, rows);
        }

        const flag = entry.c[1];
        // rows of an interrupted run of this step
        await this.driver.runSql(
          `DELETE FROM ${this.ddl(table)} WHERE ${this.ddl(FLAG)} = ?`,
          [flag]
        );
        await this.driver.insert(
          table,
          rows.map(row => Object.assign({}, row, { [FLAG]: flag }))
        );
      }
    );
  }

  /**
   * update(table, set, where, [options]), set the values of the columns in
   * set for the rows matching where.
   */
  update (table, set, where, options = {}) {
    if (!isObject(set) || !Object.keys(set).length) {
      throw new Error(`update("${table}") needs the values to set`);
    }

    const columns = Object.keys(set);
    const condition = this.where(where);
    const irreversible = options.irreversible === true;
    const key = irreversible ? null : this.key(table, options, 'update');
    const assign = columns.map(c => `${this.ddl(c)} = ?`).join(', ');
    const values = columns.map(c => toValue(set[c]));

    if (key) {
      const changed = key.filter(k => columns.indexOf(k) !== -1);
      if (changed.length) {
        throw new Error(
          `update("${table}") can not change the key ${changed.join(', ')}, ` +
            'by which it reverts the rows'
        );
      }
    }

    return this.step(
      'update',
      [table, set],
      op =>
        irreversible
          ? { t: 3, a: 'update', c: [table] }
          : {
            t: 4,
            a: 'update',
            c: [table, backupName(this.file, op), key, columns]
          },
      async entry => {
        if (irreversible || this.internals.dryRun) {
          return this.driver.runSql(
            `UPDATE ${this.ddl(table)} SET ${assign} WHERE ${condition.sql}`,
            values.concat(condition.params)
          );
        }

        await this.backup(entry, table, key.concat(columns), condition);
        await this.batches(entry, options, rows => {
          const match = this.byKey(rows, key);
          return this.driver.runSql(
            `UPDATE ${this.ddl(table)} SET ${assign} WHERE ${match.sql}`,
            values.concat(match.params)
          );
        });
      }
    );
  }

  /**
   * delete(table, where, [options]), delete the rows matching where.
   */
  delete (table, where, options = {}) {
    const condition = this.where(where);
    const irreversible = options.irreversible === true;
    const key = irreversible ? null : this.key(table, options, 'delete');

    return this.step(
      'delete',
      [table],
      op =>
        irreversible
          ? { t: 3, a: 'delete', c: [table] }
          : { t: 4, a: 'delete', c: [table, backupName(this.file, op), key] },
      async entry => {
        if (irreversible || this.internals.dryRun) {
          return this.driver.runSql(
            `DELETE FROM ${this.ddl(table)} WHERE ${condition.sql}`,
            condition.params
          );
        }

        await this.backup(entry, table, null, condition);
        await this.batches(entry, options, rows => {
          const match = this.byKey(rows, key);
          return this.driver.runSql(
            `DELETE FROM ${this.ddl(table)} WHERE ${match.sql}`,
            match.params
          );
        });
      }
    );
  }

  /**
   * runSql(sql, [params], { revert } | { irreversible: true }), revert is
   * the SQL reverting it, or [sql, params].
   */
  runSql (sql, ...args) {
    const params = Array.isArray(args[0]) ? args.shift() : [];
    const options = args[0] || {};
    const irreversible = options.irreversible === true;
    const revert =
      typeof options.revert === 'string' ? [options.revert, []] : options.revert;

    if (
      !irreversible &&
      (!Array.isArray(revert) || typeof revert[0] !== 'string')
    ) {
      throw new Error(
        'runSql in a dml migration needs the SQL reverting it, ' +
          "runSql(sql, { revert: 'sql' }), or { irreversible: true } to run " +
          'it without being able to revert it.'
      );
    }

    return this.step(
      'runSql',
      [sql],
      () =>
        irreversible
          ? { t: 3, a: 'runSql', c: [sql] }
          : { t: 4, a: 'runSql', c: [revert[0], revert[1] || []] },
      () => this.driver.runSql(sql, params)
    );
  }

  /**
   * Reading is no step, it does not change anything.
   */
  all (...args) {
    return this.driver.all(...args);
  }

  /**
   * Copies the rows about to change into the backup table of the step, only
   * once: a backup completed by an interrupted run holds the rows as they
   * were before the step.
   */
  async backup (entry, table, columns, condition) {
    if (entry.b) {
      return;
    }

    const backup = this.ddl(entry.c[1]);
    const select = columns ? columns.map(c => this.ddl(c)).join(', ') : '*';

    await this.driver.runSql(`DROP TABLE IF EXISTS ${backup}`);
    await this.driver.runSql(
      `CREATE TABLE ${backup} AS SELECT ${select} FROM ${this.ddl(table)} ` +
        'WHERE 1 = 0'
    );
    await this.driver.runSql(
      `INSERT INTO ${backup} SELECT ${select} FROM ${this.ddl(table)} ` +
        `WHERE ${condition.sql}`,
      condition.params
    );

    entry.b = 1;
    entry.o = 0;
    await this.save();
  }

  /**
   * Changes the rows of the backup in batches, ordered by their key. The
   * progress is saved after each batch, changing a batch again after an
   * interruption sets the same values.
   */
  async batches (entry, options, change) {
    const size = Number(options.batch) || BATCH;
    const backup = this.ddl(entry.c[1]);
    const key = entry.c[2].map(k => this.ddl(k)).join(', ');

    for (;;) {
      const rows = await this.driver.all(
        `SELECT ${key} FROM ${backup} ORDER BY ${key} ` +
          `LIMIT ${size} OFFSET ${entry.o}`
      );

      if (!rows.length) {
        return;
      }

      await change(rows);
      entry.o += rows.length;
      log.verbose(`[dml] ${this.file.name}: ${entry.o} rows ${entry.a}d`);
      await this.save();
    }
  }
}

/**
 * Reverts the record of one step. Each is safe to run again, so a revert
 * interrupted in between is continued by running it again.
 */
const reverts = {
  insert: (d, [table, flag]) =>
    d.driver.runSql(
      `DELETE FROM ${d.ddl(table)} WHERE ${d.ddl(FLAG)} = ?`,
      [flag]
    ),

  runSql: (d, [sql, params]) => d.driver.runSql(sql, params),

  update: async (d, [table, backup, key, columns]) => {
    let offset = 0;
    const order = key.map(k => d.ddl(k)).join(', ');
    const assign = columns.map(c => `${d.ddl(c)} = ?`).join(', ');
    const match = key.map(k => `${d.ddl(k)} = ?`).join(' AND ');

    for (;;) {
      const rows = await d.driver.all(
        `SELECT * FROM ${d.ddl(backup)} ORDER BY ${order} ` +
          `LIMIT ${BATCH} OFFSET ${offset}`
      );

      if (!rows.length) {
        return;
      }

      await Promise.each(rows, row =>
        d.driver.runSql(
          `UPDATE ${d.ddl(table)} SET ${assign} WHERE ${match}`,
          columns.map(c => row[c]).concat(key.map(k => row[k]))
        )
      );
      offset += rows.length;
    }
  },

  delete: async (d, [table, backup, key]) => {
    const [row] = await d.driver.all(`SELECT * FROM ${d.ddl(backup)} LIMIT 1`);

    if (!row) {
      return;
    }

    const columns = Object.keys(row)
      .map(c => d.ddl(c))
      .join(', ');
    const match = key
      .map(k => `${d.ddl('__dbm_t')}.${d.ddl(k)} = ${d.ddl('__dbm_b')}.${d.ddl(k)}`)
      .join(' AND ');

    // rows deleted by the step only, those not deleted yet stay as they are
    await d.driver.runSql(
      `INSERT INTO ${d.ddl(table)} (${columns}) SELECT ${columns} FROM ` +
        `${d.ddl(backup)} ${d.ddl('__dbm_b')} WHERE NOT EXISTS (SELECT 1 ` +
        `FROM ${d.ddl(table)} ${d.ddl('__dbm_t')} WHERE ${match})`
    );
  }
};

const irreversibleSteps = internals =>
  internals.modSchema.s
    .filter(entry => entry.t === 3)
    .map(entry => `step ${entry.n} ${entry.a}("${entry.c[0]}")`);

/**
 * Reverts the recorded steps, the last first. Steps with a backup table
 * restore the rows from it and drop it afterwards.
 */
const revert = async (context, file, internals, pdriver) => {
  const d = new Dml(context, file, internals, pdriver, null);
  const mod = internals.modSchema;

  while (mod.s.length) {
    const entry = mod.s[mod.s.length - 1];
    const backup = entry.a === 'update' || entry.a === 'delete';

    if (entry.t !== 4 || !reverts[entry.a]) {
      throw new Error(`Invalid state record of a dml migration, ${entry.a}`);
    }

    if (internals.dryRun && backup) {
      log.info(
        `[dml] would restore the rows of ${entry.a}("${entry.c[0]}") from ` +
          entry.c[1]
      );
    } else {
      // b: 1 the backup is complete, 2 the rows are restored from it
      if (!backup || entry.b === 1) {
        await reverts[entry.a](d, entry.c);
      }

      if (backup) {
        entry.b = 2;
        await d.save();
        await d.driver.runSql(`DROP TABLE IF EXISTS ${d.ddl(entry.c[1])}`);
      }
    }

    mod.s.pop();
    await d.save();
  }

  await State.deleteState(pdriver, file, internals);
};

const opts = context => ({
  options: context.internals.safeOptions,
  dbm: context.internals.safeOptions.dbmigrate
});

const down = async (context, driver, file, { abort } = {}) => {
  const internals = context.internals;
  const pdriver = context._pdriver;

  if (abort !== true) {
    await State.startMigration(pdriver, file, internals, { op: 'down' });
  }

  const irreversible = irreversibleSteps(internals);
  if (irreversible.length) {
    const err = new Error(
      `Migration "${file.name}" can not be reverted, it ran ` +
        `${irreversible.join(', ')} with { irreversible: true }.`
    );
    err.irreversible = true;

    if (abort !== true) {
      await State.endMigration(pdriver, file, internals);
    }

    throw err;
  }

  await revert(context, file, internals, pdriver);
  await State.endMigration(pdriver, file, internals);
  return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);
};

const up = async (context, driver, file) => {
  const internals = context.internals;
  const pdriver = context._pdriver;
  let recovery = null;

  const interrupted = await State.startMigration(pdriver, file, internals, {
    recover: true
  });

  if (interrupted) {
    const mode = recoveryMode(file, interrupted);
    log.warn(
      `[recovery] ${file.name}: the previous run was interrupted at step ` +
        `${interrupted.step}, ${interrupted.done} steps were executed, ` +
        `recovering by ${mode}`
    );

    if (mode === 'rollback') {
      await State.rollingBack(pdriver, internals);
      await revert(context, file, internals, pdriver);
      internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
      await State.endMigration(pdriver, file, internals);
      await State.startMigration(pdriver, file, internals);
    } else {
      recovery = interrupted;
    }
  }

  internals.migrationDone = recovery ? recovery.done : 0;
  const db = new Dml(context, file, internals, pdriver, recovery);

  try {
    await file.get().migrate(db, opts(context));
  } catch (err) {
    describeFailure(err, db, internals);

    if (irreversibleSteps(internals).length) {
      log.error(
        `Migration "${file.name}" failed and can not be rolled back, it ` +
          'ran a step with { irreversible: true }. The steps executed ' +
          'stay, the next run continues after them.'
      );
      throw err;
    }

    // the record of the failed step reverts what it changed, if anything
    log.error(
      `Migration "${file.name}" failed, rolling back: ${
        (err && err.message) || err
      }`
    );
    await State.rollingBack(pdriver, internals);
    await down(context, driver, file, { abort: true });
    throw err;
  }

  await Promise.promisify(context.writeMigrationRecord.bind(context))(file);
  return State.endMigration(pdriver, file, internals);
};

module.exports = { isDml, checkType, up, down, Dml, FLAG, insertRows };
