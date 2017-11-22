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
        internals.argv.count = Number.MAX_VALUE;
      }
      index.connect({
        config: config.getCurrent().settings,
        internals: internals
      }, Migrator, function (err, migrator) {
        if (!assert(err, callback)) return;

        if (internals.locTitle) {
          migrator.migrationsDir = path.resolve(internals.argv['migrations-dir'],
            internals.locTitle);
        } else { migrator.migrationsDir = path.resolve(internals.argv['migrations-dir']); }

        internals.migrationsDir = migrator.migrationsDir;

        migrator.driver.createMigrationsTable(function (err) {
          if (!assert(err, callback)) return;
          log.verbose('migration table created');

          migrator.up(internals.argv, internals.onComplete.bind(this,
            migrator, internals, callback));
        });
      });
    });
};
