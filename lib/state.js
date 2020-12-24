const MSTATE = '__dbmigrate_state__';
const SSTATE = '__dbmigrate_schema__';
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
    const schema = await driver._getKV(internals.migrationState, SSTATE);
    if (schema) {
      internals.schema = JSON.parse(schema.value);
    } else {
      await driver._insertKV(internals.migrationState, SSTATE, '{}');
    }

    if (!internals.dryRun) {
      const state = await driver._getKV(internals.migrationState, MSTATE);
      return module.exports.lockState(driver, state, internals);
    }

    return Promise.resolve();
  },

  startMigration: async function (driver, file, internals) {
    const state = await driver._getKV(internals.migrationState, MSTATE);
    const mig = await driver._getKV(internals.migrationState, file.name);

    if (mig && mig.value !== '{}') {
      internals.modSchema = JSON.parse(mig.value);
    }

    if (internals.dryRun) {
      return Promise.resolve();
    }

    await module.exports.lockState(driver, state, internals);

    if (!mig) {
      return driver._insertKV(
        internals.migrationState,
        file.name,
        JSON.stringify({})
      );
    } else {
      return Promise.resolve();
    }
  },

  update: async function (driver, file, state, internals) {
    log.verbose(`[state] update state`);
    if (internals.dryRun) {
      return Promise.resolve();
    }

    await driver._updateKV(internals.migrationState, SSTATE, internals.schema);

    return driver._updateKV(
      internals.migrationState,
      file.name,
      JSON.stringify(state)
    );
  },

  get: function (driver, file, internals) {
    return driver._getKV(internals.migrationState, file.name);
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

  deleteState: function (driver, file, internals) {
    return driver._deleteKV(internals.migrationState, file.name);
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
