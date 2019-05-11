const Promise = require('bluebird');
const Shadow = require('./driver/shadow');

class STD {
  constructor ({ schema, modSchema: mod }) {
    this.indizies = schema.i;
    this.schema = schema.c;
    this.foreign = schema.f;
    this.modS = mod.c;
    this.modI = mod.i;
    this.modF = mod.f;
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

    return Promise.resolve(alter);
  }

  createTable (t, s) {
    this.schema[t] = Object.assign({}, s);

    Object.keys(s).forEach(k => {
      const key = s[k];

      if (key.foreignKey) {
        if (!this.foreign[t]) this.foreign[t] = {};

        this.foreign[t][s.foreignKey.name] = { t, rt: key.foreignKey.table };
        if (key.foreignKey.rules) {
          this.foreign[t][s.foreignKey.name].r = s.foreignKey.rules;
        }

        let mapping = {};

        if (typeof s.foreignKey.mapping === 'string') {
          mapping[k] = s.foreignKey.mapping;
        } else {
          mapping = Object.assign({}, s.foreignKey.mapping);
        }

        this.foreign[t][s.foreignKey.name].m = mapping;
      }
    });

    return Promise.resolve();
  }

  renameTable (t, n) {
    if (this.schema[t]) {
      this.schema[n] = this.schema[t];
      delete this.schema[t];
    }

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

  removeColumn (tableName, columnName, columnSpec) {
    let alter = {};
    alter = { c: {}, i: {}, f: {} };
    if (this.schema[tableName]) {
      alter.c[tableName] = {};
      alter.c[tableName][columnName] = this.schema[tableName][columnName];
      this.modS[tableName] = {};
      this.modS[tableName][columnName] = this.schema[tableName][columnName];
      delete this.schema[tableName][columnName];
    }

    return Promise.resolve(alter);
  }

  renameColumn (t, o, n) {
    if (this.schema[t]) {
      this.schema[t][n] = this.schema[t][o];
      delete this.schema[t][o];
    }

    return Promise.resolve();
  }

  addColumn (t, c, s) {
    if (!this.schema[t]) {
      throw new Error(`There is no ${t} table in schema!`);
    }
    this.schema[t] = this.schema[t] || {};
    this.schema[t][c] = s;

    return Promise.resolve();
  }

  checkColumn (t, c) {
    if (!this.schema[t]) {
      throw new Error(`There is no ${t} table in schema!`);
    }

    if (!this.schema[t][c]) {
      throw new Error(`There is no ${c} column in schema!`);
    }
  }

  changeColumn (t, c, s) {
    this.checkColumn(t, c);

    this.schema[t][c] = Object.assign(this.schema[t][c], s);

    return Promise.resolve();
  }

  addIndex (t, i, c, u) {
    this.checkColumn(t, c);

    if (!this.schema[t][c].indizies) {
      this.schema[t][c].indizies = {};
    }

    const index = { t, c };

    if (u === true) {
      index.u = true;
    }

    if (!this.indizies[t]) this.indizies[t] = {};
    this.indizies[t][i] = index;

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
      const _std = new STD(internals);
      return Shadow.overshadow(
        driver,
        Object.assign(_std, context.learnable),
        noLearnError
      );
    }

    return Shadow.overshadow(driver, new STD(internals), noLearnError);
  }
};
