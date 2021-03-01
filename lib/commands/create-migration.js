'use strict';

const Promise = require('bluebird');
const log = require('db-migrate-shared').log;
const mkdirp = Promise.promisify(require('mkdirp'));
const fs = require('fs');
const stat = Promise.promisify(fs.stat);
const writeFile = Promise.promisify(fs.writeFile);
const yargs = require('yargs');
const util = require('util');
const path = require('path');

async function createMigrationDir (dir) {
  const res = await stat(dir).catch(_ => {
    return { err: true };
  });
  if (res && res.err === true) {
    await mkdirp(dir);
  }

  // Create migrations/package.json to ensure migration files are
  // executed as CJS and not ESM
  // https://github.com/db-migrate/node-db-migrate/issues/721
  const packageJsonPath = path.resolve(dir, 'package.json');

  await stat(packageJsonPath).then(
    async () => {
      const packageJson = require(packageJsonPath);
      packageJson.type = 'commonjs';
      const packageJsonStr = JSON.stringify(packageJson, null, 2);
      await writeFile(packageJsonPath, packageJsonStr, 'utf-8');
    },
    async (err) => {
      const packageJson = JSON.stringify({
        type: 'commonjs'
      }, null, 2)
      await writeFile(packageJsonPath, packageJson, 'utf-8');
    }
  )
}

async function executeCreateMigration (internals, config) {
  let migrationsDir = internals.argv['migrations-dir'];
  let path;
  let hooks = false;
  let pluginTemplate = false;
  let customWrite = false;
  const { plugins } = internals;

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
  } else if (shouldCreateV2File(internals, config)) {
    templateType = Migration.TemplateType.V2_DEFAULT;
  }
  if (plugins) {
    hooks = plugins.hook('create:template') || [];
  }

  if (hooks !== false) {
    for (const plugin of hooks) {
      const template = plugin['init:template']();

      if (internals.argv[template.option] || config[template.option]) {
        pluginTemplate = plugin;
        customWrite = plugin['create:template:custom:write'] === true;

        if (customWrite) {
          templateType = `${plugin.name}${templateType}`;
        } else {
          templateType = template.type;
        }

        // no reason to continue processing here
        break;
      }
    }
  }

  if (!pluginTemplate && !customWrite) {
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
  } else {
    const plugin = pluginTemplate;

    if (typeof plugin['write:template'] !== 'function') {
      log.error(`Plugin ${plugin.name} does not have function write:template`);
      throw new Error(`write:template not existent!`);
    }

    await plugin['write:template'](
      { argv: { ...internals.argv }, config: { ...config } },
      async opts => {
        let title = internals.argv.title;
        let _path = path;
        const extension = opts.extension || '.js';

        if (opts.suffix) {
          title += opts.suffix;
        }

        if (opts.pathExtension) {
          _path += opts.pathExtension;
        }

        const migration = new Migration(
          title + extension,
          _path,
          internals.runTimestamp,
          opts.type,
          internals.plugins
        );
        await migration.write();
      }
    );
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

function shouldCreateV2File (internals, config) {
  return internals.argv['v2-file'] || config['v2-file'];
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
