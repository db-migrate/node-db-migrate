'use strict';

const Promise = require('bluebird');
const log = require('db-migrate-shared').log;
const mkdirp = Promise.promisify(require('mkdirp'));
const fs = require('fs');
const stat = Promise.promisify(fs.stat);
const yargs = require('yargs');
const util = require('util');

async function createMigrationDir (dir) {
  const res = await stat(dir).catch(_ => {
    return { err: true };
  });
  if (res && res.err === true) {
    return mkdirp(dir);
  }

  return Promise.resolve();
}

async function executeCreateMigration (internals, config) {
  let migrationsDir = internals.argv['migrations-dir'];
  let path;

  internals.runTimestamp = new Date();

  if (internals.migrationMode && internals.migrationMode !== 'all') {
    migrationsDir =
      internals.argv['migrations-dir'] + '/' + internals.migrationMode;
  }

  if (internals.argv._.length === 0) {
    log.error("'migrationName' is required.");
    if (!internals.isModule) {
      yargs.showHelp();
    }

    throw new Error("'migrationName' is required.");
  }

  const Migration = require('../template.js');

  internals.argv.title = internals.argv._.shift();
  const folder = internals.argv.title.toString().split('/');

  internals.argv.title = folder[folder.length - 1] || folder[0];
  path = migrationsDir;

  if (folder.length > 1) {
    path += '/';

    for (let i = 0; i < folder.length - 1; ++i) {
      path += folder[i] + '/';
    }
  }
  internals.argv['migrations-dir'] = path;

  try {
    await createMigrationDir(path);
  } catch (err) {
    log.error('Failed to create migration directory at ', migrationsDir, err);
    throw new Error('Failed to create migration directory.');
  }

  let templateType = Migration.TemplateType.DEFAULT_JS;
  if (
    shouldCreateSqlFiles(internals, config) &&
    shouldCreateCoffeeFile(internals, config)
  ) {
    templateType = Migration.TemplateType.COFFEE_SQL_FILE_LOADER;
  } else if (
    shouldCreateSqlFiles(internals, config) &&
    shouldIgnoreOnInitFiles(internals, config)
  ) {
    templateType = Migration.TemplateType.SQL_FILE_LOADER_IGNORE_ON_INIT;
  } else if (shouldCreateSqlFiles(internals, config)) {
    templateType = Migration.TemplateType.SQL_FILE_LOADER;
  } else if (shouldCreateCoffeeFile(internals, config)) {
    templateType = Migration.TemplateType.DEFAULT_COFFEE;
  }
  const migration = new Migration(
    internals.argv.title +
      (shouldCreateCoffeeFile(internals, config) ? '.coffee' : '.js'),
    path,
    internals.runTimestamp,
    templateType,
    internals.plugins
  );

  await migration.write();
  log.info(util.format('Created migration at %s', migration.file.path));
  if (shouldCreateSqlFiles(internals, config)) {
    return createSqlFiles(internals, config);
  }

  return Promise.resolve();
}

function shouldCreateSqlFiles (internals, config) {
  return internals.argv['sql-file'] || config['sql-file'];
}

function shouldIgnoreOnInitFiles (internals, config) {
  return internals.argv['ignore-on-init'] || config['ignore-on-init'];
}

function shouldCreateCoffeeFile (internals, config) {
  return internals.argv['coffee-file'] || config['coffee-file'];
}

async function createSqlFiles (internals, config) {
  let migrationsDir = internals.argv['migrations-dir'];

  if (internals.migrationMode && internals.migrationMode !== 'all') {
    migrationsDir =
      internals.argv['migrations-dir'] + '/' + internals.migrationMode;
  }

  const sqlDir = migrationsDir + '/sqls';
  try {
    await createMigrationDir(sqlDir);
  } catch (err) {
    log.error('Failed to create migration directory at ', sqlDir, err);

    throw err;
  }

  const Migration = require('../template.js');

  const templateTypeDefaultSQL = Migration.TemplateType.DEFAULT_SQL;
  const migrationUpSQL = new Migration(
    internals.argv.title + '-up.sql',
    sqlDir,
    internals.runTimestamp,
    templateTypeDefaultSQL,
    internals.plugins
  );
  await migrationUpSQL.write();

  log.info(
    util.format('Created migration up sql file at %s', migrationUpSQL.file.path)
  );

  const migrationDownSQL = new Migration(
    internals.argv.title + '-down.sql',
    sqlDir,
    internals.runTimestamp,
    templateTypeDefaultSQL,
    internals.plugins
  );
  migrationDownSQL.write();
  log.info(
    util.format(
      'Created migration down sql file at %s',
      migrationDownSQL.file.path
    )
  );

  return Promise.resolve();
}

module.exports = executeCreateMigration;
