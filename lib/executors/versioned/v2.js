'use strict';

const Promise = require('bluebird');
const State = require('../../state');
const log = require('db-migrate-shared').log;
const Learn = require('../../learn');
const Chain = require('../../chain');
const StateTravel = require('../../methods/v2/statetravel')();
const StateNoStepTravel = require('../../methods/v2/statetravel')(false);
const Migrate = require('../../methods/v2/migrate');
const StateDone = require('../../methods/v2/statedone');
const TranslateState = require('../../methods/v2/translatestate');
const AddConventions = require('../../methods/v2/conventions');
const util = require('util');
const { recoveryMode, executedSteps, describeFailure } = require('../../recovery');
const Dml = require('../../dml');

const recoverByRollback = async (context, driver, file, interrupted) => {
  const internals = context.internals;
  const pdriver = context._pdriver;

  await State.rollingBack(pdriver, internals);
  internals.modSchema.s = internals.modSchema.s.filter(
    entry => !(entry.n > interrupted.done)
  );
  await TranslateState(context._driver, file, driver, internals, pdriver);

  internals.unlearn = false;
  internals.rollback = false;
  internals.rollbackContinue = false;
  internals.modSchema = { i: {}, c: {}, f: {}, s: [] };
  await State.endMigration(pdriver, file, internals);
};

const execUnit = {
  _extend: (context, type) => {
    return {
      atomic: function (actions) {
        const action = actions[type];
        const reverse = actions[type === 'up' ? 'up' : 'down'];

        if (!action || !reverse) {
          return Promise.reject(new Error('invalid operation'));
        }

        return action().catch(() => reverse());
      }
    };
  },

  up: async function (context, driver, file) {
    Dml.checkType(file);
    if (Dml.isDml(file)) {
      return Dml.up(context, driver, file);
    }

    const _file = file.get();
    const chain = new Chain(context._driver, file, driver, context.internals, context._pdriver);
    if (!_file._meta.noDefaultColumn) {
      chain.addChain(AddConventions);
    }
    chain.addChain(StateTravel);
    chain.addChain(Learn);
    chain.addChain(StateNoStepTravel);
    chain.addChain(Migrate);
    chain.addChain(StateDone);

    const interrupted = await State.startMigration(
      context._pdriver,
      file,
      context.internals,
      { recover: true }
    );

    if (interrupted) {
      const mode = recoveryMode(file, interrupted);
      log.warn(
        `[recovery] ${file.name}: the previous run was interrupted at step ` +
          `${interrupted.step}, ${interrupted.done} steps were executed, ` +
          `recovering by ${mode}`
      );

      if (mode === 'rollback') {
        await recoverByRollback(context, driver, file, interrupted);
        await State.startMigration(context._pdriver, file, context.internals);
      } else {
        chain.recovery = interrupted;
      }
    }

    context.internals.migrationDone = chain.recovery ? chain.recovery.done : 0;

    // startMigration - needs secondary instance since we can not afford to
    // loose state and the transaction start will include these for roll back
    // we will disable them probably at all from DDL when the driver does not
    // explicitly signal DDL transaction support (like crdb)
    try {
      await _file.migrate(chain, {
        options: context.internals.safeOptions,
        seedLink: context.seedLink,
        dbm: context.internals.safeOptions.dbmigrate
      });
    } catch (err) {
      // transfer last state
      chain.transferInt();
      executedSteps(
        context.internals,
        chain.op,
        chain.udriver._counter.previousSignal() === true
      );
      describeFailure(err, chain, context.internals);

      if (context.internals.modSchema.s.some(entry => entry.t === 3)) {
        log.error(
          `Migration "${file.name}" failed and can not be rolled back, it ` +
            'ran a step with { irreversible: true }. The steps executed ' +
            'stay, the next run continues after them.'
        );
        throw err;
      }

      log.error(
        `Migration "${file.name}" failed, rolling back: ${
          (err && err.message) || err
        }`
      );
      await State.rollingBack(context._pdriver, context.internals);
      await execUnit.down(context, driver, file, { abort: true });
      throw err;
    }
    await Promise.promisify(context.writeMigrationRecord.bind(context))(file);
    return State.endMigration(context._pdriver, file, context.internals);
    // end migration, same as start migration
  },

  fix: async function (context, driver, file) {
    Dml.checkType(file);
    if (Dml.isDml(file)) {
      log.info(`[fix] skipping "${file.name}", dml migrations change no schema`);
      return;
    }

    const _file = file.get();
    const chain = new Chain(context._driver, file, driver, context.internals, context._pdriver);
    if (!_file._meta.noDefaultColumn) {
      chain.addChain(AddConventions);
    }
    chain.addChain(Learn);
    chain.addChain(StateTravel);

    await State.startMigration(context._pdriver, file, context.internals, {
      op: 'fix'
    });
    // startMigration - needs secondary instance since we can not afford to
    // loose state and the transaction start will include these for roll back
    // we will disable them probably at all from DDL when the driver does not
    // explicitly signal DDL transaction support (like crdb)
    try {
      await _file.migrate(chain, {
        options: context.internals.safeOptions,
        seedLink: context.seedLink,
        dbm: context.internals.safeOptions.dbmigrate
      });
    } catch (err) {
      context.internals.rollback = true;

      // transfer last state
      chain.transferInt();

      describeFailure(err, chain, context.internals);
      log.error(
        `Migration "${file.name}" failed, rolling back: ${
          (err && err.message) || err
        }`
      );
      await execUnit.down(context, driver, file);
      throw err;
    }
    await State.endMigration(context._pdriver, file, context.internals);
    log.verbose(`[fix] current schema`, util.inspect(context.internals.schema, false, null, true));
    // end migration, same as start migration
  },

  down: async function (context, driver, file, { abort } = {}) {
    Dml.checkType(file);
    if (Dml.isDml(file)) {
      return Dml.down(context, driver, file, { abort });
    }

    // if we get the abort signal this means we are in a rollback routine
    // which means in turn we want to avoid reloading the state
    if (abort !== true) {
      await State.startMigration(context._pdriver, file, context.internals, {
        op: 'down'
      });
    }
    // start migration, see up comments
    try {
      await TranslateState(context._driver, file, driver, context.internals, context._pdriver);
    } catch (err) {
      // refused before changing anything, the state is left as it was
      if (err.irreversible && abort !== true) {
        await State.endMigration(context._pdriver, file, context.internals);
      }

      throw err;
    }
    await State.endMigration(context._pdriver, file, context.internals);
    return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);
    // end migration, see up comments
  }
};

module.exports = execUnit;
