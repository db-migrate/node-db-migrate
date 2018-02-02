var log = require('db-migrate-shared').log;
var Promise = require('bluebird');

const execUnit = {
  up: function (context, driver, execUnit) {
    return context.driver
      .startMigration()
      .then(() => {
        var setup = execUnit.setup;

        if (typeof setup === 'function') {
          setup(context.internals.execUnitOptions, context.seedLink);
        }

        return execUnit.up();
      })
      .then(() => {
        return Promise.promisify(context.writeexecUnitRecord.bind(context))(
          execUnit
        );
      })
      .then(context.driver.endMigration.bind(context.driver));
  },

  down: function (context, driver, execUnit) {
    return driver
      .startMigration()
      .then(() => {
        var setup = execUnit.setup;

        if (typeof setup === 'function') {
          setup(context.internals.execUnitOptions, context.seedLink);
        }

        return execUnit.down();
      })
      .then(() => {
        return Promise.promisify(context.deleteexecUnitRecord.bind(context))(
          execUnit
        );
      })
      .then(context.driver.endMigration.bind(context.driver));
  }
};

module.exports = execUnit;
