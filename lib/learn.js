const Promise = require('bluebird');
const Shadow = require('./driver/shadow');

/**
 * Objects unknown to the schema were not created by a v2 migration, but e.g.
 * by a v1 migration or by hand. The errors point to the ways of handling them:
 * adopting them into the schema first, or dropping them irreversibly.
 */
const IRREVERSIBLE = ', or pass { irreversible: true } to drop it without being able to revert it';

const unknown = (what, adopt, drop) =>
  new Error(
    `${what} is unknown to the schema of db-migrate, it was not created by a ` +
      `v2 migration. Declare it first with db.adopt.${adopt}` +
      (drop ? IRREVERSIBLE : '') +
      '.'
  );

const unknownTable = (t, drop) =>
  unknown(`The table "${t}"`, `createTable("${t}", columns)`, drop);

const unknownColumn = (t, c, drop) =>
  unknown(`The column "${c}" of "${t}"`, `addColumn("${t}", "${c}", spec)`, drop);

const unknownIndex = (t, i) =>
  unknown(`The index "${i}" of "${t}"`, `addIndex("${t}", "${i}", columns)`);

const unknownForeignKey = (t, k, drop) =>
  unknown(
    `The foreign key "${k}" of "${t}"`,
    `addForeignKey("${t}", referencedTable, "${k}", mapping)`,
    drop
  );

/**
 * A step dropping an object unknown to the schema, asked for explicitly.
 * It can not be reverted, a rollback refuses to start because of it.
 */
const irreversible = (action, args) => ({ t: 3, a: action, c: args });

class STD {
  constructor ({ schema, modSchema: mod, unlearn }, driver) {
    this.checkColumn = function (t, c, drop) {
      if (!this.schema[t]) {
        throw unknownTable(t, drop);
      }

      if (!this.schema[t][c] && !this.schema[t].columns?.[c]) {
        throw unknownColumn(t, c, drop);
      }
    };
    this.unlearn = unlearn;
    this.validations = {};
    this.driver = driver;
    this.indizies = schema.i;
    this.schema = schema.c;
    this.foreign = schema.f;
    if (!schema.e) {
      schema.e = {};
    }
    this.extra = schema.e;
    if (unlearn) {
      this.modC = [];
    } else {
      this.modC = mod.s;
    }
    this.modS = mod.c;
    this.modI = mod.i;
    this.modF = mod.f;
  }

  dropTable (t, o = {}) {
    let alter = {};
    alter = { c: {}, i: {}, f: {} };

    if (!this.schema[t] && !this.unlearn) {
      if (!o || o.irreversible !== true) {
        throw unknownTable(t, true);
      }

      this.modC.push(irreversible('dropTable', [t]));
      return Promise.resolve(alter);
    }

    if (this.schema[t]) {
      alter.c[t] = this.schema[t];
      this.modS[t] = this.schema[t];
      delete this.schema[t];
    }

    if (this.foreign[t]) {
      alter.f[t] = this.foreign[t];
      this.modF[t] = this.foreign[t];
      delete this.foreign[t];
    }

    if (this.indizies[t]) {
      alter.i[t] = this.indizies[t];
      this.modI[t] = this.indizies[t];
      delete this.indizies[t];
    }

    this.modC.push({ t: 1, a: 'createTable', c: [t] });

    return Promise.resolve(alter);
  }

  createTable (t, s) {
    this.schema[t] = Object.assign({}, s);

    Object.keys(s).forEach(k => {
      const key = s[k];

      if (key.foreignKey) {
        if (!this.foreign[t]) this.foreign[t] = {};

        this.foreign[t][key.foreignKey.name] = { t, rt: key.foreignKey.table };
        if (key.foreignKey.rules) {
          this.foreign[t][key.foreignKey.name].r = key.foreignKey.rules;
        }

        let mapping = {};

        if (typeof key.foreignKey.mapping === 'string') {
          mapping[k] = key.foreignKey.mapping;
        } else {
          mapping = Object.assign({}, key.foreignKey.mapping);
        }

        this.foreign[t][key.foreignKey.name].m = mapping;
      }
    });

    this.modC.push({ t: 0, a: 'dropTable', c: [t] });

    return Promise.resolve();
  }

  renameTable (t, n) {
    if (this.schema[t]) {
      this.schema[n] = this.schema[t];
      delete this.schema[t];
    }

    if (this.foreign[t]) {
      this.modF[n] = this.foreign[n];
      delete this.foreign[t];
    }

    if (this.indizies[t]) {
      this.modI[n] = this.indizies[t];
      delete this.indizies[t];
    }

    this.modC.push({ t: 0, a: 'renameTable', c: [n, t] });

    return Promise.resolve();
  }

  renameCollection (...args) {
    return this.renameTable.apply(this, args);
  }

  dropCollection (...args) {
    return this.dropTable.apply(this, args);
  }

  createCollection (...args) {
    return this.createTable.apply(this, args);
  }

  removeColumn (t, c, o = {}) {
    const alter = {};

    if (
      o &&
      o.irreversible === true &&
      !this.unlearn &&
      (!this.schema[t] ||
        (!this.schema[t][c] && !this.schema[t].columns?.[c]))
    ) {
      this.modC.push(irreversible('removeColumn', [t, c]));
      return Promise.resolve(alter);
    }

    this.checkColumn(t, c, true);
    const hasColumns = this.schema[t].columns !== undefined;
    const columns = hasColumns ? this.schema[t].columns : this.schema[t];

    if (columns[c].notNull === true && !this.unlearn) {
      if (this.validations.columnStrategies !== true) {
        if (
          this.driver._meta &&
          this.driver._meta.supports &&
          this.driver._meta.supports.optionParam === true
        ) {
          /**
           * This is a validation only, no action will be taken unless throwing
           * errors.
           *
           * The driver needs to respect the options properly.
           */
          switch (o.columnStrategy) {
            case 'defaultValue':
              break;
            case 'delay':
              break;
            default:
              if (!o.columnStrategy) {
                throw new Error(
                  'Can not drop a notNull column without providing a' +
                    ' recreation strategy.'
                );
              }
              throw new Error(
                `There is no such column recreation strategy "${o.columnStrategy}!"`
              );
          }
        } else {
          throw new Error(
            'This driver does not support optionParameters which are' +
              ' required to provide a recreation strategy.'
          );
        }

        if (!this.driver._meta.supports.columnStrategies) {
          throw new Error(
            'This driver does not support column recreation strategies.'
          );
        }

        this.validations.columnStrategies = true;
      }
    }

    // keep the columns removed before from the same table
    if (!this.modS[t]) this.modS[t] = {};

    if (columns[c].notNull === true && !this.unlearn) {
      switch (o.columnStrategy) {
        case 'delay':
          this.modS[t][c] = columns[c];

          o.passthrough = o.passthrough || {};
          o.passthrough.column =
            o.passthrough.column ||
            `__dbmrn_${c}_${new Date().toISOString()}__`;

          this.modC.push({
            t: 0,
            a: 'renameColumn',
            c: [t, o.passthrough.column, c]
          });

          break;
        case 'defaultValue':
          this.modS[t][c] = columns[c];
          this.modS[t][c].defaultValue = o.passthrough.defaultValue;

          this.modC.push({ t: 1, a: 'addColumn', c: [t, c, o] });
          break;
      }
    } else if (!this.unlearn) {
      this.modS[t][c] = columns[c];

      this.modC.push({ t: 1, a: 'addColumn', c: [t, c, o] });
    }

    if (hasColumns) {
      delete this.schema[t].columns[c];
    } else {
      delete this.schema[t][c];
    }

    return Promise.resolve(alter);
  }

  renameColumn (t, o, n) {
    if (this.schema[t]) {
      this.schema[t][n] = this.schema[t][o];
      delete this.schema[t][o];
    }

    this.modC.push({ t: 0, a: 'renameColumn', c: [t, n, o] });

    return Promise.resolve();
  }

  addColumn (t, c, s) {
    if (!this.schema[t]) {
      throw unknownTable(t);
    }
    this.schema[t] = this.schema[t] || {};
    const hasColumns = this.schema[t].columns !== undefined;
    const columns = hasColumns ? this.schema[t].columns : this.schema[t];

    columns[c] = s;

    this.modC.push({ t: 0, a: 'removeColumn', c: [t, c] });

    return Promise.resolve();
  }

  changeColumn (t, c, s) {
    this.checkColumn(t, c);

    if (!this.modS[t]) this.modS[t] = {};

    const hasColumns = this.schema[t].columns !== undefined;
    const columns = hasColumns ? this.schema[t].columns : this.schema[t];

    this.modS[t][c] = columns[c];
    columns[c] = Object.assign(columns[c], s);

    this.modC.push({ t: 1, a: 'changeColumn', c: [t, c] });

    return Promise.resolve();
  }

  addIndex (t, i, c, u) {
    if (Array.isArray(c)) {
      c.forEach(x => this.checkColumn(t, typeof x === 'object' ? x.name : x));
    } else {
      this.checkColumn(t, c);
    }

    const index = { t, c };

    if (u === true) {
      index.u = true;
    }

    if (!this.indizies[t]) this.indizies[t] = {};
    this.indizies[t][i] = index;

    this.modC.push({ t: 0, a: 'removeIndex', c: [t, i] });

    return Promise.resolve();
  }

  removeIndex (t, _i) {
    let alter = {};
    alter = { c: {}, i: {}, f: {} };

    let i;
    if (!_i) {
      i = t;
    } else {
      i = _i;
    }

    if (!this.schema[t]) {
      throw unknownTable(t);
    }

    if (!this.indizies[t] || !this.indizies[t][i]) {
      throw unknownIndex(t, i);
    }

    alter.i[t] = {};
    alter.i[t][i] = this.indizies[t][i];
    if (!this.modI[t]) this.modI[t] = {};
    this.modI[t][i] = this.indizies[t][i];
    delete this.indizies[t][i];

    this.modC.push({ t: 1, a: 'addIndex', c: [t, i] });

    return Promise.resolve(alter);
  }

  addForeignKey (t, rt, k, m, r) {
    if (!this.schema[t]) {
      throw unknownTable(t);
    }

    if (!this.schema[rt]) {
      throw unknownTable(rt);
    }

    if (!this.foreign[t]) this.foreign[t] = {};

    this.foreign[t][k] = { t, rt, m };

    if (r) {
      this.foreign[t][k].r = r;
    }

    this.modC.push({ t: 0, a: 'removeForeignKey', c: [t, k] });

    return Promise.resolve();
  }

  removeForeignKey (t, k, o) {
    let alter = {};
    alter = { c: {}, i: {}, f: {} };
    const known = this.schema[t] && this.foreign[t] && this.foreign[t][k];

    if (!known && o && o.irreversible === true && !this.unlearn) {
      this.modC.push(irreversible('removeForeignKey', [t, k]));
      return Promise.resolve(alter);
    }

    if (!this.schema[t]) {
      throw unknownTable(t, true);
    }

    if (!this.foreign[t] || !this.foreign[t][k]) {
      throw unknownForeignKey(t, k, true);
    }

    alter.f[t] = {};
    alter.f[t][k] = this.foreign[t][k];
    if (!this.modF[t]) this.modF[t] = {};
    this.modF[t][k] = this.foreign[t][k];
    delete this.foreign[t][k];

    this.modC.push({ t: 1, a: 'addForeignKey', c: [t, k] });

    return Promise.resolve(alter);
  }

  //
  //  checkDBMS: dummy,
  //
  //  createDatabase: dummy,
  //
  //  switchDatabase: dummy,
  //
  //  dropDatabase: dummy,
  //
  //  runSql: dummy,
}

const noLearnError = prop => {
  return function () {
    throw new Error(`Can't learn function ${prop}`);
  };
};

module.exports = {
  // learns the schema and records the reverse operations
  learns: true,

  unknownTable,
  unknownColumn,

  getInterface: (context, file, driver, internals) => {
    if (context.learnable) {
      const _std = new STD(internals, context);
      return Shadow.overshadow(
        driver,
        Object.assign(_std, context.learnable),
        noLearnError
      );
    }

    return Shadow.overshadow(driver, new STD(internals, context), noLearnError);
  }
};
