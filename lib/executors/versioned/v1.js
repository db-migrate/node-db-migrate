'use strict';

const Promise = require('bluebird');
const maybePromised = require('../../temputils.js').maybePromised;

const execUnit = {
  up: function (context, driver, file) {
    return context.driver
      .startMigration()
      .then(() => {
        const _file = file.get();

        if (typeof _file.setup === 'function') {
          _file.setup(context.internals.safeOptions, context.seedLink);
        }

        return maybePromised(file, _file.up, [context.driver]);
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

        if (typeof _file.setup === 'function') {
          _file.setup(context.internals.safeOptions, context.seedLink);
        }

        return maybePromised(file, _file.down, [context.driver]);
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
