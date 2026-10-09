'use strict';

const Seed = require('../../seed');

/**
 * Connects like the migrations do, the seeds need the schema of the state
 * to know the tables they can insert into.
 */
module.exports = async function (internals, config, action) {
  const Migrator = require('../../walker.js');
  const index = require('../../../connect');

  const migrator = await index.connect(
    {
      config: config.getCurrent().settings,
      internals: internals,
      prefix: 'migration'
    },
    Migrator
  );

  try {
    await migrator.createMigrationsTable();
    await Seed[action](migrator, internals.seedName);
    return internals.onComplete(migrator, internals);
  } catch (err) {
    return internals.onComplete(migrator, internals, err);
  }
};
