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

  learn: (context, driver, file) => {
    const _file = file.get();

    const i = Learn.getInterface(
      context._driver,
      file,
      driver,
      context.internals
    );

    return _file.migrate(i, {
      options: context.internals.safeOptions,
      seedLink: context.seedLink,
      dbm: context.internals.safeOptions.dbmigrate
    });
  },

  up: async function (context, driver, file) {
    const _file = file.get();
    const chain = new Chain(context._driver, file, driver, context.internals);
    chain.addChain(Learn);
    chain.addChain(StateTravel);
    chain.addChain(Migrate);

    await State.startMigration(context._driver, file, context.internals);
    try {
      await _file.migrate(chain, {
        options: context.internals.safeOptions,
        seedLink: context.seedLink,
        dbm: context.internals.safeOptions.dbmigrate
      });
    } catch (err) {
      log.error(
        'An error occured. No alternative failure strategy defined. Rolling back!'
      );
      await execUnit.down(context, driver, file);
      throw err;
    }
    return Promise.promisify(context.writeMigrationRecord.bind(context))(file);
    return execUnit.learn(context, driver, file);

    return context.driver
      .startMigration()
      .then(() => {
        const _file = file.get();

        return _file.migrate(context.driver, {
          options: context.internals.safeOptions,
          seedLink: context.seedLink,
          dbm: context.internals.safeOptions.dbmigrate
        });
      })
      .then(() => {
        return Promise.promisify(context.writeMigrationRecord.bind(context))(
          file
        );
      })
      .then(context.driver.endMigration.bind(context.driver));
  },

  down: async function (context, driver, file) {
    await State.startMigration(context._driver, file, context.internals);
    await TranslateState(context._driver, file, driver, context.internals);
    await State.endMigration(context._driver, file, context.internals);
    return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);

    await _file.migrate(chain, {
      options: context.internals.safeOptions,
      seedLink: context.seedLink,
      dbm: context.internals.safeOptions.dbmigrate
    });
    return Promise.promisify(context.deleteMigrationRecord.bind(context))(file);

    return driver
      .startMigration()
      .then(() => {
        const _file = file.get();

        return _file.down(context.driver, {
          options: context.internals.safeOptions,
          seedLink: context.seedLink,
          dbm: context.internals.safeOptions.dbmigrate
        });
      })
      .then(() => {
        return Promise.promisify(context.deleteMigrationRecord.bind(context))(
          file
        );
      })
      .then(context.driver.endMigration.bind(context.driver));
  }
};

module.exports = execUnit;
