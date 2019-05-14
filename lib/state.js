const MSTATE = '__dbmigrate_state__';
const log = require('db-migrate-shared').log;

module.exports = {
  lockState: async function (driver, state, internals) {
    if (!state) {
      return driver._insertKV(
        internals.migrationState,
        MSTATE,
        JSON.stringify({
          s: {
            step: 0,
            fin: 0,
            date: new Date()
          }
        })
      );
    } else {
      state = state.value;
      state = JSON.parse(state);
      state.s.date = new Date();
      return driver._updateKV(
        internals.migrationState,
        MSTATE,

        JSON.stringify(state)
      );
    }
  },

  init: async function (driver, internals) {
    await driver._createKV(internals.migrationState);
    if (!internals.dryRun) {
      let state = await driver._getKV(internals.migrationState, MSTATE);
      return module.exports.lockState(driver, state, internals);
    }

    return Promise.resolve();
  },

  startMigration: async function (driver, file, internals) {
    let state = await driver._getKV(internals.migrationState, MSTATE);

    if (internals.dryRun) {
      return Promise.resolve();
    }

    await module.exports.lockState(driver, state, internals);

    return driver._insertKV(
      internals.migrationState,
      file.name,
      JSON.stringify({})
    );
  },

  update: function (driver, file, state, internals) {
    console.log('called');
    if (internals.dryRun) {
      log.info(`[state] update state`);
      return Promise.resolve();
    }

    return driver._updateKV(internals.migrationState, file.name, state);
  },

  tick: async function (driver, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    let { value: state } = await driver._getKV(
      internals.migrationState,
      MSTATE
    );
    state = JSON.parse(state);
    state.s.date = new Date();
    return driver._updateKV(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state)
    );
  },

  step: async function (driver, step, internals) {
    log.verbose(`[state] proceeded to step ${step}`);
    if (internals.dryRun) {
      return Promise.resolve();
    }

    let { value: state } = await driver._getKV(
      internals.migrationState,
      MSTATE
    );
    state = JSON.parse(state);
    state.s.date = new Date();
    state.s.step = step;
    return driver._updateKV(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state)
    );
  },

  endMigration: async function (driver, file, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    let { value: state } = await driver._getKV(
      internals.migrationState,
      MSTATE
    );
    state = JSON.parse(state);
    state.s.date = new Date();
    state.s.fin = 1;

    return driver._updateKV(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state)
    );
  }
};
