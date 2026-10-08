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

/**
 * Persists the state around learning a step. Before learning (step) it
 * records the step as started, afterwards it tags the recorded reverse
 * operations with their step and records the step as learned.
 */
class StateTravel {
  constructor (internals, file, driver, pdriver, step = true) {
    this.file = file;
    this.internals = internals;
    this.driver = driver;
    this.pdriver = pdriver;
    this._default = async function _default () {
      const op = this.internals.migrationOp;

      if (step) {
        await State.step(this.pdriver, op, this.internals);
      } else {
        this.internals.modSchema.s.forEach(entry => {
          if (entry.n === undefined) entry.n = op;
        });
      }

      await State.update(
        this.pdriver,
        this.file,
        this.internals.modSchema,
        this.internals
      );

      if (!step) {
        await State.learned(this.pdriver, op, this.internals);
      }
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

module.exports = function (step = true) {
  return {
    getInterface: (context, file, driver, internals, pdriver) => {
      if (context.learnable) {
        const st = new StateTravel(internals, file, context, pdriver, step);
        return Shadow.overshadow(
          driver,
          Object.assign(st, context.statechanger),
          noTravelError
        );
      }

      return Shadow.overshadow(
        driver,
        new StateTravel(internals, file, context, pdriver, step),
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
};
