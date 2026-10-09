'use strict';

const path = require('path');
const migrationHook = require('./helper/migration-hook.js');
const status = require('../status');

/**
 * The status of the database, see lib/status.js.
 */
module.exports = async function (internals, config) {
  await migrationHook(internals);
  const Migrator = require('../walker.js');
  const index = require('../../connect');

  const migrator = await index.connect(
    {
      config: config.getCurrent().settings,
      internals: internals,
      prefix: 'migration'
    },
    Migrator
  );

  migrator.directory = path.resolve(
    internals.argv['migrations-dir'],
    internals.locTitle || ''
  );

  try {
    await migrator.createMigrationsTable();
    const result = await status(migrator);
    return internals.onComplete(migrator, internals, null, result);
  } catch (err) {
    return internals.onComplete(migrator, internals, err);
  }
};
