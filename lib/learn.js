const Promise = require('bluebird');
const Shadow = require('./driver/shadow');

function dummy () {
  arguments[arguments.length - 1]('not implemented');
}

class STD {
  constructor ({ schema, modSchema: mod }) {
    this.indizies = schema.i;
    this.schema = schema.c;
    this.foreign = schema.f;
    this.modS = mod.c;
    this.modI = mod.i;
    this.modF = mod.f;
  }

  dropTable (tableName) {
    if (this.schema[tableName]) {
      this.modS[tableName] = this.schema[tableName];
      delete this.schema[tableName];
    }

    return Promise.resolve();
  }

  createTable (tableName, columnSpec) {
    this.schema[tableName] = Object.assign({}, columnSpec);

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
    if (this.schema[tableName]) {
      this.modS[tableName] = {};
      this.modS[tableName][columnName] = this.schema[tableName][columnName];
      delete this.schema[tableName][columnName];
    }

    return Promise.resolve();
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

    this.modI[i] = this.indizies[t][i];
    delete this.indizies[t][i];

    return Promise.resolve();
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
    if (!this.schema[t]) {
      throw new Error(`There is no ${t} table in schema!`);
    }

    if (!this.foreign[t] || !this.foreign[t][k]) {
      throw new Error(`There is no foreign key ${k} in ${t} table!`);
    }

    delete this.foreign[t][k];

    return Promise.resolve();
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

Object.keys(STD.prototype).forEach(method => {
  const m = STD.prototype[method];
  STD.prototype[method] = function (...args) {
    let cb = args.pop();
    if (typeof cb !== 'function') {
      args.push(cb);
      cb = undefined;
    }

    return m.apply(this, args).asCallback(cb);
  };
});

const noLearnError = prop => {
  return function () {
    throw new Error(`Can't learn function ${prop}`);
  };
};

module.exports = {
  getInterface: (context, driver, internals) => {
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
