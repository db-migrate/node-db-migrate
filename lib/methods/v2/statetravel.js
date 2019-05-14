const Promise = require('bluebird');
const Shadow = require('../../driver/shadow');
const State = require('../../state');
const DEFAULT = {
  renameCollection: 'renameCollection',
  dropCollection: 'createCollection',
  createCollection: 'dropCollection',
  createTable: 'dropTable',
  dropTable: 'createTable',
  renameTable: 'renameTable',
  addColumn: 'removeColumn',
  removeColumn: 'addColumn',
  renameColumn: 'renameColumn',
  changeColumn: 'changeColumn',
  addIndex: 'removeIndex',
  removeIndex: 'addIndex',
  addForeignKey: 'removeForeignKey',
  removeForeignKey: 'addForeignKey'
};

class StateTravel {
  constructor (internals, file, driver) {
    this.file = file;
    this.internals = internals;
    this.driver = driver;
    this._counter = 0;
  }
}

Object.keys(DEFAULT).forEach(m => {
  StateTravel.prototype[m] = async function (...args) {
    await State.step(this.driver, ++this._counter, this.internals);
    const res = await State.update(
      this.driver,
      this.file,
      this.internals.modSchema,
      this.internals
    );

    console.log('result', res);
    return res;
  };
});

const noTravelError = prop => {
  return function () {
    throw new Error(`Can't state travel function ${prop}`);
  };
};

module.exports = {
  getInterface: (context, file, driver, internals) => {
    if (context.learnable) {
      const st = new StateTravel(internals, file, context);
      return Shadow.overshadow(
        driver,
        Object.assign(st, context.statechanger),
        noTravelError
      );
    }

    return Shadow.overshadow(
      driver,
      new StateTravel(internals, file, context),
      noTravelError
    );
  },

  hasModification: true,

  modify: (context, driver, internals) => {
    let _driver = Object.assign({}, driver);
    _driver.host = {};
    ['addForeignKey'].forEach(m => {
      _driver.host[m] = _driver[m];
      _driver[m] = function (...args) {
        return Promise.resolve();
      };
    });

    return { driver: _driver };
  }
};
