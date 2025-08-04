'use strict';

const Promise = require('bluebird');
const State = require('../../state');
const log = require('db-migrate-shared').log;
const Learn = require('../../learn');
const Chain = require('../../chain');
const StateTravel = require('../../methods/v2/statetravel');
const Migrate = require('../../methods/v2/migrate');
const TranslateState = require('../../methods/v2/translatestate');
const AddConventions = require('../../methods/v2/conventions');
const util = require('util');

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
    chain.addChain(Learn);
    chain.addChain(StateTravel);
    chain.addChain(Migrate);

    await State.startMigration(context._pdriver, file, context.internals);
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

    await State.startMigration(context._pdriver, file, context.internals);
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
    if (abort === true) {
      await State.startMigration(context._pdriver, file, context.internals);
    }
    // start migration, see up comments
    await TranslateState(context._driver, file, driver, context.internals, context._pdriver);
    await State.endMigration(context._pdriver, file, context.internals);
    return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);
    // end migration, see up comments
  }
};

module.exports = execUnit;
