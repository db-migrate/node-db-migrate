'use strict';

const Promise = require('bluebird');
const Learn = require('../../learn');

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
    const i = Learn.getInterface(context._driver, driver, context.internals);

    return _file.migrate(i, {
      options: context.internals.safeOptions,
      seedLink: context.seedLink,
      dbm: context.internals.safeOptions.dbmigrate
    });
  },

  up: function (context, driver, file) {
    return execUnit.learn(context, driver, file);

    return context.driver
      .startMigration()
      .then(() => {
        const _file = file.get();

        return _file.up(context.driver, {
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

  down: function (context, driver, file) {
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
