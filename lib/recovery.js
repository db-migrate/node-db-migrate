'use strict';

const log = require('db-migrate-shared').log;

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

/**
 * Name the instruction a migration failed at, or after if the instruction
 * itself finished and the migration code failed afterwards.
 */
const describeFailure = (err, chain, internals) => {
  if (!err || typeof err !== 'object' || err.instruction || chain.op === 0) {
    return;
  }

  const after = internals.migrationDone >= chain.op;
  err.instruction = `${after ? 'after' : 'at'} step ${chain.op} ${
    chain.current
  }`;
};

module.exports = { RECOVERY_MODES, recoveryMode, executedSteps, describeFailure };
