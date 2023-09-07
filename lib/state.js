const MSTATE = '__dbmigrate_state__';
const SSTATE = '__dbmigrate_schema__';
const RUNON = 'run_on';

const log = require('db-migrate-shared').log;
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const ID = crypto.randomBytes(32).toString('base64');
let owner = false;

module.exports = {
  /**
   * Lock state will add the basic state controller an ID
   * and a process controlled date.
   * It is important that all systems are in sync. We will use the
   * database clock instead if possible.
   */
  lockState: async function (driver, state, internals) {
    if (!state) {
      owner = true;
      return driver._insertKV(
        internals.migrationState,
        MSTATE,
        JSON.stringify({
          s: {
            step: 0,
            fin: 0,
            ID,
            date: new Date()
          }
        })
      );
    } else {
      let runOn = state.run_on;
      state = state.value;
      state = JSON.parse(state);

      if (!state.s.ID || state.s.ID !== ID) {
        owner = true;
        state.s.ID = ID;
      }

      const d = new Date();

      state.s.date = d;
      await driver._updateKVC(
        internals.migrationState,
        MSTATE,
        JSON.stringify(state),
        RUNON,
        runOn
      );

      state = await driver._getKV(internals.migrationState, MSTATE);

      runOn = state.run_on;
      state = state.value;
      state = JSON.parse(state);

      if (state.s.ID !== ID) {
        owner = false;
      }
    }
  },

  isOwner: function () {
    return owner;
  },

  init: async function (driver, internals, { emptyState, backupState }) {
    await driver._createKV(internals.migrationState);
    const _schema = await driver._getKV(internals.migrationState, SSTATE);

    if (_schema && backupState) {
      const newName = `${internals.migrationState}_b_${Math.floor((new Date() - 0) / 1000)}`;
      log.info(`[state] Created a backup of ${internals.migrationState} by writing to file ${newName}.dbmigrate`);

      await fs.writeFile(path.resolve(`${newName}.dbmigrate`), JSON.stringify(_schema), 'utf8');

      if (emptyState) {
        await driver.renameTable(internals.migrationState,
          newName);

        log.info(`[state] Created a backup of ${internals.migrationState} by renaming table to ${newName}`);
        await driver._createKV(internals.migrationState);
        await driver._insertKV(internals.migrationState, SSTATE, '{}');
      }
    }

    const schema = emptyState !== true ? _schema : null;
    if (schema) {
      internals.schema = JSON.parse(schema.value);
    } else if (!emptyState) {
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

    let state = await driver._getKV(
      internals.migrationState,
      MSTATE
    );

    let runOn = state.run_on;
    state = state.value;
    state = JSON.parse(state);

    if (!state.s.ID || state.s.ID !== ID) {
      owner = true;
      state.s.ID = ID;
    }

    const d = new Date();

    state.s.date = d;
    await driver._updateKVC(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state),
      RUNON,
      runOn
    );

    state = await driver._getKV(internals.migrationState, MSTATE);

    runOn = state.run_on;
    state = state.value;
    state = JSON.parse(state);

    if (state.s.ID !== ID) {
      owner = false;
    }
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

    // unlock from current process
    state.s.ID = 0;

    return driver._updateKV(
      internals.migrationState,
      MSTATE,
      JSON.stringify(state)
    );
  }
};
