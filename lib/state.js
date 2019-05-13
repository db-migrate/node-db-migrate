const MSTATE = '__dbmigrate_state__';

module.exports = {
  init: function (driver, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    return driver._createKV(internals.migrationState);
  },

  startMigration: async function (driver, file, internals) {
    let state = await driver._getKV(internals.migrationState, MSTATE);

    if (internals.dryRun) {
      return Promise.resolve();
    }

    if (!state) {
      await driver._insertKV(
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
      state = JSON.parse(state);
      state.s.date = new Date();
      await driver._updateKV(
        internals.migrationState,
        MSTATE,

        JSON.stringify(state)
      );
    }

    return driver._insertKV(
      internals.migrationState,
      file.name,
      JSON.stringify({})
    );
  },

  update: function (driver, file, state, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    return driver._updateKV(internals.migrationState, file.name, state);
  },

  tick: async function (driver, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    let state = await driver._getKV(internals.migrationState, MSTATE);
    state = JSON.parse(state);
    state.s.date = new Date();
    return driver._updateKV(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state)
    );
  },

  step: async function (driver, step, internals) {
    if (internals.dryRun) {
      return Promise.resolve();
    }

    let state = await driver._getKV(internals.migrationState, MSTATE);
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

    let state = await driver._getKV(internals.migrationState, MSTATE);
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
