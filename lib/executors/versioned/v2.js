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

/**
 * How to recover from an interrupted run of a migration, set per migration
 * by _meta.recovery:
 *
 * skip: skip the steps already executed and continue with the rest
 * rollback: revert the steps already executed and run the migration again
 */
const RECOVERY_MODES = ['skip', 'rollback'];
const RECOVERY_DEFAULT = 'skip';

const recoveryMode = (file, interrupted) => {
  const name = file.name;
  const mode = file.get()._meta.recovery || RECOVERY_DEFAULT;

  if (RECOVERY_MODES.indexOf(mode) === -1) {
    throw new Error(
      `Invalid recovery mode "${mode}" in migration "${name}", use one of ` +
        RECOVERY_MODES.join(', ')
    );
  }

  if (interrupted.rollback) {
    if (mode !== 'rollback') {
      log.warn(
        `[recovery] ${name}: the previous run was interrupted while rolling ` +
          'back, continuing the rollback'
      );
    }

    return 'rollback';
  }

  if (mode === 'skip' && interrupted.changed) {
    throw new Error(
      `Migration "${name}" was interrupted at step ${interrupted.step} and ` +
        'changed since, so the executed steps can not be skipped safely. ' +
        "Set _meta.recovery to 'rollback' to revert them, or repair the " +
        'state manually.'
    );
  }

  return mode;
};

/**
 * Revert the steps executed by an interrupted run. A step started but not
 * done did not change the database, so its reverse operation is dropped.
 */
/**
 * Keep the reverse operations of the steps executed on the database. The
 * failed step only changed the database, if its main statement went through
 * before failing, signaled by the driver (e.g. a foreign key of createTable
 * failed after the table was created).
 */
const executedSteps = (internals, failed, signaled) => {
  const done = internals.migrationDone;

  internals.modSchema.s = internals.modSchema.s.filter(
    entry =>
      entry.n <= done || (signaled && failed > done && entry.n === failed)
  );
};

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

      log.error(
        'An error occured. No alternative failure strategy defined. Rolling back!',
        err
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

      log.error(
        'An error occured. No alternative failure strategy defined. Rolling back!',
        err
      );
      await execUnit.down(context, driver, file);
      throw err;
    }
    await State.endMigration(context._pdriver, file, context.internals);
    log.verbose(`[fix] current schema`, util.inspect(context.internals.schema, false, null, true));
    // end migration, same as start migration
  },

  down: async function (context, driver, file, { abort } = {}) {
    // if we get the abort signal this means we are in a rollback routine
    // which means in turn we want to avoid reloading the state
    if (abort !== true) {
      await State.startMigration(context._pdriver, file, context.internals, {
        op: 'down'
      });
    }
    // start migration, see up comments
    await TranslateState(context._driver, file, driver, context.internals, context._pdriver);
    await State.endMigration(context._pdriver, file, context.internals);
    return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);
    // end migration, see up comments
  }
};

module.exports = execUnit;
