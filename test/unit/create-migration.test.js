'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const path = require('path');
const createMigration = require('../../lib/commands/create-migration');
const config = require('../../lib/config');
const testHelper = require('./testHelper.js');

lab.experiment('create-migration.js', () => {
  lab.experiment('create migration', () => {
    let _internals;
    let _config;
    const env = 'test';
    const configPath = path.join(__dirname, 'database.json');
    const migrationsFolder = testHelper.migrationsFolder;
    const migrationName = 'migration-Name';

    lab.beforeEach(() => {
      _internals = {
        argv: {
          _: [migrationName],
          'migrations-dir': migrationsFolder
        }
      };
      _config = config.load(configPath, env);
    });

    lab.afterEach(async () => {
      await testHelper.wipeMigrations();
    });

    lab.test('with no arguments should throw error', async () => {
      _internals.argv._ = [];
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.reject();
    });

    lab.test('with no template type should create default js migration file', async () => {
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.not.reject();

      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => new RegExp(`${migrationName}.js$`).test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));
      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
      Code.expect(fs.existsSync(path.join(migrationsFolder, 'sqls'))).to.be.false();
    });

    lab.test('with sql and coffee template type should create sqls + coffee migration file', async () => {
      _internals.argv['sql-file'] = true;
      _internals.argv['coffee-file'] = true;
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.not.reject();

      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => new RegExp(`${migrationName}.coffee$`).test(file));
      let packageJsonFile = files.find((file) => /package\.json$/.test(file));
      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();

      const sqlFiles = fs.readdirSync(path.join(migrationsFolder, 'sqls'));
      const migrationUpFile = sqlFiles.find((file) => new RegExp(`${migrationName}-up.sql$`).test(file));
      const migrationDownFile = sqlFiles.find((file) => new RegExp(`${migrationName}-down.sql$`).test(file));
      packageJsonFile = sqlFiles.find((file) => /package\.json$/.test(file));
      Code.expect(migrationUpFile).to.exist();
      Code.expect(migrationDownFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });

    lab.test('with sql and ignore-on-init template type should create sqls + js migration file', async () => {
      _internals.argv['sql-file'] = true;
      _internals.argv['ignore-on-init'] = true;
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.not.reject();

      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => new RegExp(`${migrationName}.js$`).test(file));
      let packageJsonFile = files.find((file) => /package\.json$/.test(file));
      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();

      const sqlFiles = fs.readdirSync(path.join(migrationsFolder, 'sqls'));
      const migrationUpFile = sqlFiles.find((file) => new RegExp(`${migrationName}-up.sql$`).test(file));
      const migrationDownFile = sqlFiles.find((file) => new RegExp(`${migrationName}-down.sql$`).test(file));
      packageJsonFile = sqlFiles.find((file) => /package\.json$/.test(file));
      Code.expect(migrationUpFile).to.exist();
      Code.expect(migrationDownFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });

    lab.test('with sql and js template type should create sqls + js migration file', async () => {
      _internals.argv['sql-file'] = true;
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.not.reject();

      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => new RegExp(`${migrationName}.js$`).test(file));
      let packageJsonFile = files.find((file) => /package\.json$/.test(file));
      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();

      const sqlFiles = fs.readdirSync(path.join(migrationsFolder, 'sqls'));
      const migrationUpFile = sqlFiles.find((file) => new RegExp(`${migrationName}-up.sql$`).test(file));
      const migrationDownFile = sqlFiles.find((file) => new RegExp(`${migrationName}-down.sql$`).test(file));
      packageJsonFile = sqlFiles.find((file) => /package\.json$/.test(file));
      Code.expect(migrationUpFile).to.exist();
      Code.expect(migrationDownFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });

    lab.test('with coffee template type should create coffee migration file', async () => {
      _internals.argv['coffee-file'] = true;
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.not.reject();

      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => new RegExp(`${migrationName}.coffee$`).test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));
      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
      Code.expect(fs.existsSync(path.join(migrationsFolder, 'sqls'))).to.be.false();
    });

    lab.test('with v2 template type should create v2 js migration file', async () => {
      _internals.argv['v2-file'] = true;
      const fn = createMigration.bind(null, _internals, _config);
      await Code.expect(fn()).to.not.reject();

      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => new RegExp(`${migrationName}.js$`).test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));
      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
      Code.expect(fs.existsSync(path.join(migrationsFolder, 'sqls'))).to.be.false();
    });
  });
});
