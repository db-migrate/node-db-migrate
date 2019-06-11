'use strict';

const Promise = require('bluebird');
const State = require('../../state');
const log = require('db-migrate-shared').log;
const Learn = require('../../learn');
const Chain = require('../../chain');
const StateTravel = require('../../methods/v2/statetravel');
const Migrate = require('../../methods/v2/migrate');
const TranslateState = require('../../methods/v2/translatestate');

const execUnit = {
  _extend: (context, type) => {
    return {
      atomic: function (actions) {
        let action = actions[type];
        let reverse = actions[type === 'up' ? 'up' : 'down'];

        if (!action || !reverse) {
          return Promise.reject(new Error('invalid operation'));
        }

        return action().catch(() => reverse());
      }
    };
  },

  up: async function (context, driver, file) {
    const _file = file.get();
    const chain = new Chain(context._driver, file, driver, context.internals);
    chain.addChain(Learn);
    chain.addChain(StateTravel);
    chain.addChain(Migrate);

    await State.startMigration(context._driver, file, context.internals);
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
      log.error(
        'An error occured. No alternative failure strategy defined. Rolling back!',
        err
      );
      await execUnit.down(context, driver, file);
      throw err;
    }
    return Promise.promisify(context.writeMigrationRecord.bind(context))(file);
    // end migration, same as start migration
  },

  down: async function (context, driver, file) {
    // start migration, see up comments
    await State.startMigration(context._driver, file, context.internals);
    await TranslateState(context._driver, file, driver, context.internals);
    await State.endMigration(context._driver, file, context.internals);
    return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);
    // end migration, see up comments
  }
};

module.exports = execUnit;
