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
 * delete in soft mode: the rows are not deleted, but get a timestamp in a
 *         column of the user and a mark in their flag, reverting removes
 *         both again. purge deletes such rows for good.
 * runSql: reverted by the SQL given with { revert }
 *
 * Each step, and each batch of a step, runs inside a transaction, unless
 * the migration opts out with _meta.transactions = false.
 *
 * The records are { t: 4, a: action, c: args }, or { t: 3 } for a step which
 * can not be reverted, run with { irreversible: true } or a purge.
 */

const FLAG = '__dbmigrate__flag';
const BATCH = 1000;
const TYPES = ['dml'];
const PG = ['pg', 'cockroachdb', 'postgres', 'postgresql'];

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

const meta = file => file.get()._meta || {};

const isDml = file => meta(file).type === 'dml';

const isBackground = file => isDml(file) && meta(file).background === true;

const checkType = file => {
  const { type, background } = meta(file);

  if (type !== undefined && TYPES.indexOf(type) === -1) {
    throw new Error(
      `Invalid migration type "${type}" in migration "${file.name}", use ` +
        TYPES.join(', ') +
        ' or leave it out for a schema migration'
    );
  }

  if (background === true && type !== 'dml') {
    throw new Error(
      `Migration "${file.name}" runs in the background, which only dml ` +
        "migrations can, set _meta.type to 'dml'"
    );
  }
};

/**
 * Stops a worker between two batches, the job is continued later.
 */
class Stopped extends Error {
  constructor () {
    super('stopped');
    this.stopped = true;
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const backupName = (file, op) =>
  '__dbm_backup_' +
  crypto
    .createHash('sha256')
    .update(`${file.name}#${op}`)
    .digest('hex')
    .slice(0, 16);

// the mark of a soft delete in the flag of a row
const deleted = (file, op) => `|del:${file.name}#${op}`;

// a LIKE pattern matching text literally, with ! as escape character
const like = text => text.replace(/[!%_]/g, c => '!' + c);

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

/**
 * The progress of a migration run in the foreground is kept in the row of
 * the migration lock, see State.
 */
const foreground = (pdriver, internals) => ({
  step: op => State.step(pdriver, op, internals),
  learned: op => State.learned(pdriver, op, internals),
  done: op => State.done(pdriver, op, internals)
});

class Dml {
  /**
   * progress: records the steps started, learned and done
   * work: options of a background worker, batch and pause between batches,
   *       stopping() tells to stop after the current batch
   */
  constructor (context, file, internals, pdriver, recovery, progress, work = {}) {
    this.driver = context._driver;
    this.file = file;
    this.internals = internals;
    this.pdriver = pdriver;
    this.recovery = recovery;
    this.progress = progress || foreground(pdriver, internals);
    this.work = work;
    this.transactional = meta(file).transactions !== false;
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
   * Reads rows with parameters written as ?, all of pg takes $1, $2, ...
   */
  select (sql, params = []) {
    if (!params.length) {
      return this.driver.all(sql);
    }

    if (PG.indexOf(this.driver._dbmDriver) !== -1) {
      let i = 0;
      sql = sql.replace(/\?/g, () => `$${++i}`);
    }

    // with a callback, all of db-migrate-sqlite3 before 1.2.1 drops the
    // parameters without one
    return Promise.fromCallback(cb => this.driver.all(sql, params, cb));
  }

  /**
   * sql followed by a text parameter. CONCAT of PostgreSQL can not tell the
   * type of a parameter, || of MySQL is OR.
   */
  concat (sql) {
    return this.driver._dbmDriver === 'mysql'
      ? `CONCAT(${sql}, ?)`
      : `(${sql} || CAST(? AS TEXT))`;
  }

  /**
   * Runs fn inside a transaction, rolled back if it fails.
   */
  async tx (fn) {
    if (!this.transactional || this.internals.dryRun) {
      return fn();
    }

    await this.driver.runSql('BEGIN');

    let ret;
    try {
      ret = await fn();
    } catch (err) {
      try {
        await this.driver.runSql('ROLLBACK');
      } catch (rollbackErr) {
        log.verbose('[dml] rollback failed', rollbackErr.message);
      }

      throw err;
    }

    await this.driver.runSql('COMMIT');
    return ret;
  }

  /**
   * Between batches, a worker in the background pauses and stops if asked.
   */
  async between () {
    if (this.work.stopping && this.work.stopping()) {
      throw new Stopped();
    }

    // migrations paused the jobs
    if (this.work.yielding && (await this.work.yielding())) {
      throw new Stopped();
    }

    if (this.work.pause) {
      await delay(this.work.pause);
    }
  }

  batchSize (options) {
    return Number(options.batch) || Number(this.work.batch) || BATCH;
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
        `${action}("${table}") needs the primary key of "${table}", which is ` +
          "unknown to the schema of db-migrate. Pass it with { key: 'id' }" +
          (action === 'purge'
            ? '.'
            : ', or pass { irreversible: true } to change the rows without ' +
              'being able to revert it.')
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
   * Changes the rows matching condition in batches by their key, until none
   * matches anymore. Changing a row has to make it stop matching, so this
   * continues by itself after an interruption.
   */
  async untilDone (table, key, condition, options, change) {
    const size = this.batchSize(options);
    const order = key.map(k => this.ddl(k)).join(', ');

    for (;;) {
      const rows = await this.select(
        `SELECT ${order} FROM ${this.ddl(table)} WHERE ${condition.sql} ` +
          `ORDER BY ${order} LIMIT ${size}`,
        condition.params
      );

      if (!rows.length) {
        return;
      }

      await this.tx(() => change(this.byKey(rows, key)));
      await this.between();
    }
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

    await this.progress.step(op);

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
      await this.save();
      await this.progress.learned(op);
    }

    await execute(entry, op);

    internals.migrationDone = op;
    await this.progress.done(op);
    await this.between();
  }

  /**
   * The records of the migration, its schema stays as it is.
   */
  save () {
    if (this.internals.dryRun) {
      return Promise.resolve();
    }

    return this.pdriver._updateKV(
      this.internals.migrationState,
      this.file.name,
      JSON.stringify(this.internals.modSchema)
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
      entry =>
        this.tx(async () => {
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
        })
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
          return this.tx(() =>
            this.driver.runSql(
              `UPDATE ${this.ddl(table)} SET ${assign} WHERE ${condition.sql}`,
              values.concat(condition.params)
            )
          );
        }

        await this.backup(entry, table, key.concat(columns), condition);
        await this.batches(entry, options, match =>
          this.driver.runSql(
            `UPDATE ${this.ddl(table)} SET ${assign} WHERE ${match.sql}`,
            values.concat(match.params)
          )
        );
      }
    );
  }

  /**
   * delete(table, where, [options]), delete the rows matching where.
   *
   * mode 'copy' (default) copies the rows to a backup table first. mode
   * 'soft' keeps the rows, sets column to the current time, or value, and
   * marks them in their flag. The application filters them by column, until
   * purge deletes them.
   */
  delete (table, where, options = {}) {
    const mode = options.mode || 'copy';

    if (mode === 'soft') {
      return this.softDelete(table, where, options);
    }

    if (mode !== 'copy') {
      throw new Error(
        `delete("${table}") has no mode "${mode}", use 'copy' or 'soft'`
      );
    }

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
          return this.tx(() =>
            this.driver.runSql(
              `DELETE FROM ${this.ddl(table)} WHERE ${condition.sql}`,
              condition.params
            )
          );
        }

        await this.backup(entry, table, null, condition);
        await this.batches(entry, options, match =>
          this.driver.runSql(
            `DELETE FROM ${this.ddl(table)} WHERE ${match.sql}`,
            match.params
          )
        );
      }
    );
  }

  softDelete (table, where, options) {
    const column = options.column;
    const columns = this.columns(table);

    if (typeof column !== 'string') {
      throw new Error(
        `delete("${table}") in soft mode needs the column marking the rows ` +
          "as deleted, { mode: 'soft', column: 'deleted_at' }"
      );
    }

    if (!columns || !columns[FLAG]) {
      throw new Error(
        `delete("${table}") in soft mode marks the rows in their ${FLAG} ` +
          'column, which only tables created by v2 migrations have'
      );
    }

    const condition = this.where(where);
    const key = this.key(table, options, 'delete');
    const time = options.value === undefined;

    return this.step(
      'delete',
      [table],
      op => ({ t: 4, a: 'soft', c: [table, column, key, deleted(this.file, op)] }),
      entry => {
        const mark = entry.c[3];
        const set =
          `${this.ddl(column)} = ${time ? 'CURRENT_TIMESTAMP' : '?'}, ` +
          `${this.ddl(FLAG)} = ${this.concat(`COALESCE(${this.ddl(FLAG)}, '')`)}`;
        const value = time ? [mark] : [toValue(options.value), mark];
        // rows deleted already, by the application or before, stay as they are
        const active = {
          sql: `(${condition.sql}) AND ${this.ddl(column)} IS NULL`,
          params: condition.params
        };

        if (this.internals.dryRun) {
          return this.driver.runSql(
            `UPDATE ${this.ddl(table)} SET ${set} WHERE ${active.sql}`,
            value.concat(active.params)
          );
        }

        return this.untilDone(table, key, active, options, match =>
          this.driver.runSql(
            `UPDATE ${this.ddl(table)} SET ${set} WHERE ${match.sql}`,
            value.concat(match.params)
          )
        );
      }
    );
  }

  /**
   * purge(table, [migration], [options]), deletes the rows deleted in soft
   * mode for good, of all migrations or of the one named. It can not be
   * reverted.
   */
  purge (table, migration, options = {}) {
    if (isObject(migration)) {
      options = migration;
      migration = undefined;
    }

    const key = this.key(table, options, 'purge');
    const mark = migration ? `|del:${migration}#` : '|del:';

    return this.step(
      'purge',
      [table].concat(migration ? [migration] : []),
      () => ({ t: 3, a: 'purge', c: [table] }),
      () => {
        const condition = {
          sql: `${this.ddl(FLAG)} LIKE ? ESCAPE '!'`,
          params: [`%${like(mark)}%`]
        };

        if (this.internals.dryRun) {
          return this.driver.runSql(
            `DELETE FROM ${this.ddl(table)} WHERE ${condition.sql}`,
            condition.params
          );
        }

        return this.untilDone(table, key, condition, options, match =>
          this.driver.runSql(
            `DELETE FROM ${this.ddl(table)} WHERE ${match.sql}`,
            match.params
          )
        );
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
      () => this.tx(() => this.driver.runSql(sql, params))
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

    // outside of transactions, creating tables commits them in MySQL
    await this.driver.runSql(`DROP TABLE IF EXISTS ${backup}`);
    await this.driver.runSql(
      `CREATE TABLE ${backup} AS SELECT ${select} FROM ${this.ddl(table)} ` +
        'WHERE 1 = 0'
    );
    await this.tx(() =>
      this.driver.runSql(
        `INSERT INTO ${backup} SELECT ${select} FROM ${this.ddl(table)} ` +
          `WHERE ${condition.sql}`,
        condition.params
      )
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
    const size = this.batchSize(options);
    const backup = this.ddl(entry.c[1]);
    const key = entry.c[2];
    const order = key.map(k => this.ddl(k)).join(', ');

    for (;;) {
      const rows = await this.driver.all(
        `SELECT ${order} FROM ${backup} ORDER BY ${order} ` +
          `LIMIT ${size} OFFSET ${entry.o}`
      );

      if (!rows.length) {
        return;
      }

      await this.tx(() => change(this.byKey(rows, key)));
      entry.o += rows.length;
      log.verbose(`[dml] ${this.file.name}: ${entry.o} rows ${entry.a}d`);
      await this.save();
      await this.between();
    }
  }
}

/**
 * Reverts the record of one step. Each is safe to run again, so a revert
 * interrupted in between is continued by running it again.
 */
const reverts = {
  insert: (d, [table, flag]) =>
    d.tx(() =>
      d.driver.runSql(
        `DELETE FROM ${d.ddl(table)} WHERE ${d.ddl(FLAG)} = ?`,
        [flag]
      )
    ),

  runSql: (d, [sql, params]) => d.tx(() => d.driver.runSql(sql, params)),

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

      await d.tx(() =>
        Promise.each(rows, row =>
          d.driver.runSql(
            `UPDATE ${d.ddl(table)} SET ${assign} WHERE ${match}`,
            columns.map(c => row[c]).concat(key.map(k => row[k]))
          )
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
    await d.tx(() =>
      d.driver.runSql(
        `INSERT INTO ${d.ddl(table)} (${columns}) SELECT ${columns} FROM ` +
          `${d.ddl(backup)} ${d.ddl('__dbm_b')} WHERE NOT EXISTS (SELECT 1 ` +
          `FROM ${d.ddl(table)} ${d.ddl('__dbm_t')} WHERE ${match})`
      )
    );
  },

  soft: (d, [table, column, key, mark]) =>
    d.untilDone(
      table,
      key,
      {
        sql: `${d.ddl(FLAG)} LIKE ? ESCAPE '!'`,
        params: [`%${like(mark)}%`]
      },
      {},
      match =>
        d.driver.runSql(
          `UPDATE ${d.ddl(table)} SET ${d.ddl(column)} = NULL, ` +
            `${d.ddl(FLAG)} = NULLIF(REPLACE(${d.ddl(FLAG)}, ?, ''), '') ` +
            `WHERE ${match.sql}`,
          [mark].concat(match.params)
        )
    )
};

const irreversibleSteps = internals =>
  internals.modSchema.s
    .filter(entry => entry.t === 3)
    .map(entry => `step ${entry.n} ${entry.a}("${entry.c[0]}")`);

/**
 * Reverts the recorded steps, the last first. Steps with a backup table
 * restore the rows from it and drop it afterwards.
 */
const revert = async (context, file, internals, pdriver, d) => {
  d = d || new Dml(context, file, internals, pdriver, null);
  const mod = internals.modSchema;

  while (mod.s.length) {
    const entry = mod.s[mod.s.length - 1];
    const backup = entry.a === 'update' || entry.a === 'delete';

    if (entry.t !== 4 || !reverts[entry.a]) {
      throw new Error(`Invalid state record of a dml migration, ${entry.a}`);
    }

    if (internals.dryRun && (backup || entry.a === 'soft')) {
      log.info(
        `[dml] would revert ${entry.a}("${entry.c[0]}")` +
          (backup ? ` from ${entry.c[1]}` : '')
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

const irreversibleError = (file, internals) => {
  const irreversible = irreversibleSteps(internals);

  if (!irreversible.length) {
    return null;
  }

  const err = new Error(
    `Migration "${file.name}" can not be reverted, it ran ` +
      `${irreversible.join(', ')}, which can not be reverted.`
  );
  err.irreversible = true;
  return err;
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

  const err = irreversibleError(file, internals);
  if (err) {
    if (abort !== true) {
      await State.endMigration(pdriver, file, internals);
    }

    throw err;
  }

  await revert(context, file, internals, pdriver);
  await State.endMigration(pdriver, file, internals);
  return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);
};

/**
 * Runs the migration, after recovering an interrupted run, and rolls it
 * back if it fails. Shared by the foreground and the background workers.
 *
 * hooks.rollingBack: records that the rollback started
 * hooks.restart: records a fresh start after recovering by rollback
 */
const execute = async (context, file, internals, pdriver, interrupted, progress, work, hooks) => {
  let recovery = null;

  if (interrupted) {
    const mode = recoveryMode(file, interrupted);
    log.warn(
      `[recovery] ${file.name}: the previous run was interrupted at step ` +
        `${interrupted.step}, ${interrupted.done} steps were executed, ` +
        `recovering by ${mode}`
    );

    if (mode === 'rollback') {
      await hooks.rollingBack();
      await revert(context, file, internals, pdriver);
      internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
      await hooks.restart();
    } else {
      recovery = interrupted;
    }
  }

  internals.migrationDone = recovery ? recovery.done : 0;
  const db = new Dml(context, file, internals, pdriver, recovery, progress, work);

  try {
    await file.get().migrate(db, opts(context));
  } catch (err) {
    if (err && err.stopped) {
      throw err;
    }

    describeFailure(err, db, internals);

    if (irreversibleSteps(internals).length) {
      log.error(
        `Migration "${file.name}" failed and can not be rolled back, it ` +
          'ran a step which can not be reverted. The steps executed stay, ' +
          'the next run continues after them.'
      );
      throw err;
    }

    // the record of the failed step reverts what it changed, if anything
    log.error(
      `Migration "${file.name}" failed, rolling back: ${
        (err && err.message) || err
      }`
    );
    await hooks.rollingBack();
    await revert(context, file, internals, pdriver, db);
    err.rolledBack = true;
    throw err;
  }
};

const up = async (context, driver, file) => {
  const internals = context.internals;
  const pdriver = context._pdriver;

  const interrupted = await State.startMigration(pdriver, file, internals, {
    recover: true
  });

  try {
    await execute(context, file, internals, pdriver, interrupted, null, {}, {
      rollingBack: () => State.rollingBack(pdriver, internals),
      restart: async () => {
        await State.endMigration(pdriver, file, internals);
        await State.startMigration(pdriver, file, internals);
      }
    });
  } catch (err) {
    if (err && err.rolledBack) {
      await State.endMigration(pdriver, file, internals);
    }

    throw err;
  }

  await Promise.promisify(context.writeMigrationRecord.bind(context))(file);
  return State.endMigration(pdriver, file, internals);
};

module.exports = {
  isDml,
  isBackground,
  checkType,
  up,
  down,
  execute,
  revert,
  irreversibleError,
  Dml,
  Stopped,
  FLAG,
  insertRows
};
