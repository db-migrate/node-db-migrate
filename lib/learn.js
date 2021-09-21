const Promise = require('bluebird');
const Shadow = require('./driver/shadow');

class STD {
  constructor ({ schema, modSchema: mod }, driver) {
    this.checkColumn = function (t, c) {
      if (!this.schema[t]) {
        throw new Error(`There is no ${t} table in schema!`);
      }

      if (!this.schema[t][c]) {
        throw new Error(`There is no ${c} column in schema!`);
      }
    };
    this.validations = {};
    this.driver = driver;
    this.indizies = schema.i;
    this.schema = schema.c;
    this.foreign = schema.f;
    if (!schema.e) {
      schema.e = {};
    }
    this.extra = schema.e;
    this.modS = mod.c;
    this.modI = mod.i;
    this.modF = mod.f;
    this.modC = mod.s;
  }

  dropTable (t) {
    let alter = {};
    alter = { c: {}, i: {}, f: {} };

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
    this.checkColumn(t, c);

    if (this.schema[t][c].notNull === true) {
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

    this.modS[t] = {};

    if (this.schema[t][c].notNull === true) {
      switch (o.columnStrategy) {
        case 'delay':
          this.modS[t][c] = this.schema[t][c];

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
          this.modS[t][c] = this.schema[t][c];
          this.modS[t][c].defaultValue = o.passthrough.defaultValue;

          this.modC.push({ t: 1, a: 'addColumn', c: [t, c, o] });
          break;
      }
    } else {
      this.modS[t][c] = this.schema[t][c];

      this.modC.push({ t: 1, a: 'addColumn', c: [t, c, o] });
    }

    delete this.schema[t][c];

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
      throw new Error(`There is no ${t} table in schema!`);
    }
    this.schema[t] = this.schema[t] || {};
    this.schema[t][c] = s;

    this.modC.push({ t: 0, a: 'removeColumn', c: [t, c] });

    return Promise.resolve();
  }

  changeColumn (t, c, s) {
    this.checkColumn(t, c);

    if (!this.modS[t]) this.modS[t] = {};

    this.modS[t][c] = this.schema[t][c];
    this.schema[t][c] = Object.assign(this.schema[t][c], s);

    this.modC.push({ t: 1, a: 'changeColumn', c: [t, c] });

    return Promise.resolve();
  }

  addIndex (t, i, c, u) {
    if (Array.isArray(c)) {
      c.forEach(x => this.checkColumn(t, x));
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
      throw new Error(`There is no ${t} table in schema!`);
    }

    if (!this.indizies[t] || !this.indizies[t][i]) {
      throw new Error(`There is no index ${i} in ${t} table!`);
    }

    alter.i[t] = {};
    alter.i[t][i] = this.indizies[t][i];
    this.modI[t] = {};
    this.modI[t][i] = this.indizies[t][i];
    delete this.indizies[t][i];

    this.modC.push({ t: 1, a: 'addIndex', c: [t, i] });

    return Promise.resolve(alter);
  }

  addForeignKey (t, rt, k, m, r) {
    if (!this.schema[t]) {
      throw new Error(`There is no ${t} table in schema!`);
    }

    if (!this.schema[rt]) {
      throw new Error(`There is no ${rt} table in schema!`);
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

    if (!this.schema[t]) {
      throw new Error(`There is no ${t} table in schema!`);
    }

    if (!this.foreign[t] || !this.foreign[t][k]) {
      throw new Error(`There is no foreign key ${k} in ${t} table!`);
    }

    alter.f[t] = {};
    alter.f[t][k] = this.foreign[t][k];
    this.modF[t] = {};
    this.modF[t][k] = this.foreign[t][k];
    delete this.foreign[t][k];

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
