var path = require('path');
var log = require('db-migrate-shared').log;
var assert = require('./helper/assert.js');
var migrationHook = require('./helper/migration-hook.js');

module.exports = function (internals, config, callback) {
  migrationHook(internals)
    .then(function () {
      var Migrator = require('../migrator.js');
      var index = require('../../connect');

      if (!internals.argv.count) {
        log.info('Defaulting to running 1 down migration.');
        internals.argv.count = 1;
      }

      index.connect({
        config: config.getCurrent().settings,
        internals: internals
      }, Migrator, function (err, migrator) {
        if (!assert(err)) return;

        migrator.migrationsDir = path.resolve(internals.argv['migrations-dir']);

        migrator.driver.createMigrationsTable(function (err) {
          if (!assert(err)) return;
          migrator.down(internals.argv, internals.onComplete.bind(this,
            migrator, internals, callback));
        });
      });
    });
};
