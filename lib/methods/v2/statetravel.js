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
    this._default = async function _default () {
      await State.step(this.driver, ++this._counter, this.internals);

      return State.update(
        this.driver,
        this.file,
        this.internals.modSchema,
        this.internals
      );
    };
  }
}

Object.keys(DEFAULT).forEach(m => {
  StateTravel.prototype[m] = async function (...args) {
    return this._default();
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
  }

  /* hasModification: true,

  modify: (context, driver, internals) => {
    let _driver = Object.assign({}, driver);
    _driver.host = {};
    // Inject into chained operations, in this case
    // we directly process information from the major
    // creation object, so this serves only as an example currently.
    // ['addForeignKey'].forEach(m => {
    //  _driver.host[m] = _driver[m];
    //  _driver[m] = function (...args) {
    //    return _driver.host[m].apply(_driver, args);
    //  };
    // });

    return { driver: _driver };
  } */
};
