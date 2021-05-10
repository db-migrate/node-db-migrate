'use strict';

const path = require('path');
const log = require('db-migrate-shared').log;
const migrationHook = require('./helper/migration-hook.js');

async function prepare (internals, config) {
  await migrationHook(internals);
  const Migrator = require('../walker.js');
  const index = require('../../connect');

  if (!internals.argv.count) {
    internals.argv.count = Number.MAX_VALUE;
  }
  const migrator = await index.connect(
    {
      config: config.getCurrent().settings,
      internals: internals,
      prefix: 'migration'
    },
    Migrator
  );

  if (internals.locTitle) {
    migrator.migrationsDir = path.resolve(
      internals.argv['migrations-dir'],
      internals.locTitle
    );
  } else {
    migrator.migrationsDir = path.resolve(internals.argv['migrations-dir']);
  }

  internals.migrationsDir = migrator.migrationsDir;

  await migrator.createMigrationsTable();
  log.verbose('migration table created');

  return migrator;
}

module.exports = async function (internals, config) {
  const migrator = await prepare(internals, config);

  try {
    const res = await migrator.up(internals.argv);
    return internals.onComplete(migrator, internals, null, res);
  } catch (err) {
    return internals.onComplete(migrator, internals, err);
  }
};
