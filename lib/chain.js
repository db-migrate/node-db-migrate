const log = require('db-migrate-shared').log;
const Release = require('./release');
const { unknownTable, unknownColumn } = require('./learn');

const DEFAULT = [
  'renameCollection',
  'dropCollection',
  'createCollection',
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
  'removeForeignKey'
];

/**
 * Human readable form of an instruction for the log, like
 * addColumn("users", "email")
 */
const describe = (method, args) =>
  `${method}(${args
    .filter(
      a =>
        typeof a === 'string' ||
        typeof a === 'number' ||
        (Array.isArray(a) && a.every(x => typeof x === 'string'))
    )
    .map(a => JSON.stringify(a))
    .join(', ')})`;

/**
 * Instructions declaring an object, which can adopt objects created outside
 * of v2 migrations into the schema, see adopt.
 */
const ADOPTABLE = /^(create|add)/;

/**
 * Adopting is for objects unknown to the schema only.
 */
const assertUnknown = (m, args, schema) => {
  const [t, a, b] = args;
  let known = false;

  switch (m) {
    case 'createTable':
    case 'createCollection':
      known = !!schema.c[t];
      break;
    case 'addColumn':
      known = !!(schema.c[t] && (schema.c[t][a] || schema.c[t].columns?.[a]));
      break;
    case 'addIndex':
      known = !!(schema.i[t] && schema.i[t][a]);
      break;
    case 'addForeignKey':
      known = !!(schema.f[t] && schema.f[t][b]);
      break;
  }

  if (known) {
    throw new Error(
      `${describe(m, args)} is known to the schema already, adopt is for ` +
        'objects created outside of v2 migrations only.'
    );
  }
};

let rollbackCounter = 0;
let rollbackSignal = null;
let signal = null;
let counter = 0;

const dbmControl = {
  inc: () => {
    ++counter;
  },

  signal: () => {
    signal = true;
  },

  hasSignaled: () => {
    return signal;
  },

  previousSignal: () => {
    const r = rollbackSignal;
    // we reset on retrieval and mark as retrieved
    rollbackSignal = rollbackSignal === null ? null : false;
    return r;
  },

  get: () => {
    return counter;
  },

  getPrevious: () => {
    const r = rollbackCounter;

    // we reset on retrieval and mark as retrieved
    rollbackCounter = rollbackCounter > 0 ? false : 0;

    return r;
  }
};

class Chain {
  constructor (context, file, driver, internals, pdriver) {
    this.file = file;
    this.context = context;
    this.driver = context;
    this.pdriver = pdriver;
    this.udriver = driver;
    if (this.udriver._dbmControl !== true) {
      this.udriver._counter = dbmControl;
      this.udriver._dbmControl = true;
      const runSql = this.udriver.runSql;
      this.udriver._dbmControlRSQL = runSql;

      // couple runSql
      this.udriver.runSql = function (...args) {
        return runSql.apply(this, args).then(x => {
          ++counter;
          return x;
        });
      };
    }
    this.internals = internals;
    this.chains = [];
    this.interfaces = [];
    this.it = 0;
    this._step = null;
    this._interface = null;

    /**
     * op: number of the current step, the instructions of a migration
     * recovery: progress of an interrupted previous run to resume from,
     *           see State.startMigration
     */
    this.op = 0;
    this.recovery = null;

    /**
     * adopt: declares objects created outside of v2 migrations, e.g. by v1
     * migrations, so v2 migrations can work with them. Only learns them,
     * nothing is executed, and reverting it only forgets them again.
     */
    this.adopt = {};

    this.deprecations();

    DEFAULT.concat(Object.keys(this.context.learnable || [])).forEach(
      method => {
        this[method] = function (...args) {
          // we don't handle any callbacks here, v2 ultimately deprecates them

          this.transferInt();

          return this.exec.apply(this, [method].concat(args));
        };

        if (ADOPTABLE.test(method)) {
          this.adopt[method] = async (...args) => {
            this.transferInt();
            assertUnknown(method, args, this.internals.schema);

            return this.run(method, args, 'adopt');
          };
        }
      }
    );
  }

  /**
   * deprecateTable, deprecateColumn and dropDeprecated, see Release. The
   * marks are learned only, relaxing notNull of a column is executed.
   */
  deprecations () {
    const internals = this.internals;

    this.deprecateTable = async (t, options) => {
      this.transferInt();
      if (!internals.schema.c[t]) {
        throw unknownTable(t);
      }

      const entry = Release.entry(internals, t, options, this.file);
      return this.run('setDeprecated', ['tables', t, null, entry], 'learn');
    };

    this.deprecateColumn = async (t, c, options) => {
      this.transferInt();
      const columns = Release.columnsOf(internals.schema, t);
      if (!columns) {
        throw unknownTable(t);
      }

      if (!columns[c]) {
        throw unknownColumn(t, c);
      }

      const entry = Release.entry(internals, c, options, this.file);
      if (columns[c].notNull) {
        // the application stops writing it. The whole spec, MySQL changes
        // a column by its full definition
        await this.changeColumn(
          t,
          c,
          Object.assign({}, columns[c], { notNull: false })
        );
      }

      return this.run('setDeprecated', ['columns', t, c, entry], 'learn');
    };

    /**
     * dropDeprecated() drops what is due, dropDeprecated(table) or
     * dropDeprecated(table, column) the one named, due or not.
     */
    this.dropDeprecated = async (t, c) => {
      this.transferInt();
      const items = Release.list(
        internals,
        internals.releaseCurrent || 0,
        internals.releaseIndex || {}
      );
      let targets;

      if (t === undefined) {
        targets = items.filter(
          item => item.age >= Release.settings(internals, item.entry).releases
        );
      } else {
        targets = items.filter(item =>
          c === undefined
            ? item.kind === 'tables' && item.t === t
            : item.kind === 'columns' && item.t === t && item.c === c
        );

        if (!targets.length) {
          throw new Error(
            `${c === undefined ? `The table "${t}"` : `The column "${c}" of "${t}"`} ` +
              'is not deprecated, deprecate it first'
          );
        }
      }

      for (const item of targets) {
        await Release.drop(this, item);
      }
    };
  }

  transferInt () {
    rollbackCounter = counter;
    counter = 0;
    rollbackSignal = signal;
    signal = null;
  }

  addChain (chain) {
    this.chains.push(chain);
  }

  step () {
    this._step = this.chains[this.it];
    if (!this._step) return null;
    if (!this.interfaces[this.it]) {
      this.interfaces[this.it] = this._step.getInterface(
        this.context,
        this.file,
        this.udriver,
        this.internals,
        this.pdriver
      );
    }

    this._interface = this.interfaces[this.it++];
    return this._step;
  }

  reset () {
    this.it = 0;
  }

  async exec (m, ...args) {
    return this.run(m, args, null);
  }

  /**
   * Learn an instruction only, without executing it, to revert an adopt.
   */
  async learnOnly (m, ...args) {
    return this.run(m, args, 'learn');
  }

  /**
   * mode: null to execute the instruction, 'adopt' or 'learn' to only learn
   * it, skipping the links executing it on the database
   */
  async run (m, args, mode) {
    let ret;
    const stat = [];
    const op = ++this.op;
    const recovery = this.recovery;
    this.internals.migrationOp = op;
    this.current = describe(m, args);

    if (recovery && op <= recovery.done) {
      log.info(
        `[recovery] ${this.file.name}: skipping already executed step ` +
          `${op}/${recovery.done} ${describe(m, args)}`
      );
      return ret;
    }

    // the step was interrupted after its reverse operation was recorded,
    // but before it finished on the database
    const learned = recovery !== null && op <= recovery.learned;
    if (learned) {
      log.info(
        `[recovery] ${this.file.name}: executing interrupted step ${op} ` +
          `${describe(m, args)} without learning it again`
      );
    }

    while (this.step()) {
      if (learned && this._step.learns) {
        continue;
      }

      if (mode && this._step.executes) {
        continue;
      }

      const mod = this.internals.modSchema;
      const recorded = mod ? mod.s.length : 0;
      ret = await this._interface[m].apply(this._interface, args);
      stat.push(ret);

      // an adopted object is only forgotten again when reverting
      if (mode === 'adopt' && this._step.learns && mod) {
        mod.s.slice(recorded).forEach(entry => {
          entry.t = 2;
        });
      }

      if (this._step.hasStateUsage) {
        this._step.useState(ret);
      }

      // need to check if we still want this
      if (this._step.hasModification) {
        const ret = this._step.modify(
          this.context,
          this.udriver,
          this.internals
        );

        if (ret.driver) {
          this.udriver = ret.driver;
        }
      }
    }

    this.reset();
    return ret;
  }
}

module.exports = Chain;
