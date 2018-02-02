const Promise = require('bluebird');
const { maybePromise } = require('../../temputils.js');

const execUnit = {
  up: function (context, driver, file) {
    return context.driver
      .startMigration()
      .then(() => {
        const _file = file.get();

        if (typeof _file.setup === 'function') {
          _file.setup(context.internals.fileOptions, context.seedLink);
        }

        return maybePromise(_file.up);
      })
      .then(() => {
        return Promise.promisify(context.writeRecord.bind(context))(file);
      })
      .then(context.driver.endMigration.bind(context.driver));
  },

  down: function (context, driver, file) {
    return driver
      .startMigration()
      .then(() => {
        const _file = file.get();

        if (typeof _file.setup === 'function') {
          _file.setup(context.internals.fileOptions, context.seedLink);
        }

        return maybePromise(_file.down);
      })
      .then(() => {
        return Promise.promisify(context.deleteRecord.bind(context))(file);
      })
      .then(context.driver.endMigration.bind(context.driver));
  }
};

module.exports = execUnit;
