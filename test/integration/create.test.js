'use strict';

//#region Imports
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Promise = require('bluebird');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const dbmUtil = require('db-migrate-shared').util;
const mkdirp = Promise.promisify(require('mkdirp'));
const rmdir = Promise.promisify(require('rimraf'));
const writeFile = Promise.promisify(fs.writeFile);
const log = require('db-migrate-shared').log;
//#endregion

//#region Variables
const migrationsFolder = path.join(__dirname, 'migrations');
//#endregion

//#region Functions
const wipeMigrations = function () {
  const dir = migrationsFolder;
  return rmdir(dir);
};

const dbMigrate = function () {
  const args = dbmUtil.toArray(arguments);
  const dbm = path.join(__dirname, '..', '..', 'bin', 'db-migrate');
  args.unshift(dbm);

  try {
    return new Promise((resolve, reject) => {
      cp.spawn('node', args, { cwd: __dirname })
        .on('exit', (code) => resolve(code))
        .on('error', (error) => reject(error));
    });
  } catch (error) {
    log.error(error);
    Promise.reject(new Error(1));
  }
};
//#endregion

// Tests
lab.experiment('create', () => {
  lab.experiment('without a migration directory', () => {
    let exitCode;

    lab.before(async () => {
      await wipeMigrations();
      exitCode = await dbMigrate('create', 'first migration');
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will create a new migration directory', () => {
      const stats = fs.statSync(migrationsFolder);
      Code.expect(stats.isDirectory()).to.be.true();
    });

    lab.test('will create a new migrations/<files>', () => {
      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find(file => /first-migration\.js$/.test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));

      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });
  });

  lab.experiment('with existing migrations/package.json file', () => {
    let exitCode;

    lab.before(async () => {
      await wipeMigrations();
      await mkdirp(migrationsFolder);
      await writeFile(
        path.join(migrationsFolder, 'package.json'),
        `{"name": "test", 
        "type": "module", 
        "description": "Database migration framework for node.js",
        "dependencies":{
          "db-migrate-shared": "^1.2.0"
        }}`
      );
      exitCode = await dbMigrate('create', 'first migration');
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will modify an existing migrations/package.json\'s type field', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(migrationsFolder, 'package.json')));
      Code.expect(packageJson.type).to.equal('commonjs');
    });

    lab.test('will preserve other properties in an existing package.json', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(migrationsFolder, 'package.json')));
      Code.expect(packageJson.name).to.equal('test');
      Code.expect(packageJson.description).to.equal('Database migration framework for node.js');
      Code.expect(packageJson.dependencies).to.equal({
        'db-migrate-shared': '^1.2.0'
      });
    });
  });

  lab.experiment('with sql-file option set to true from config file', () => {
    let exitCode;

    lab.before(async () => {
      const configOption =
        `--config=${path.join(__dirname, 'database_with_sql_file.json')}`
      ;
      await wipeMigrations();
      exitCode = await dbMigrate('create', 'second migration', configOption);
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will create a new migrations/<files>', () => {
      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => /second-migration\.js$/.test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));

      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });

    lab.test('will create a new migrations/sqls directory', () => {
      const stats = fs.statSync(path.join(migrationsFolder, 'sqls'));
      Code.expect(stats.isDirectory()).to.be.true();
    });

    lab.test('will create a new migrations/sqls/<files>', () => {
      const files = fs.readdirSync(path.join(migrationsFolder, 'sqls'));
      const upFile = files.find(file => /second-migration-up\.sql$/.test(file));
      const downFile = files.find(file => /second-migration-down\.sql$/.test(file));

      Code.expect(upFile).to.exist();
      Code.expect(downFile).to.exist();
    });
  });

  lab.experiment('with sql-file option set to true as a command parameter', () => {
    let exitCode;

    lab.before(async () => {
      const configOption = path.join('--sql-file');
      await wipeMigrations();
      exitCode = await dbMigrate('create', 'third migration', configOption);
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will create a new migrations/<files>', () => {
      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => /third-migration\.js$/.test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));

      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });

    lab.test('will create a new migrations/sqls directory', () => {
      const stats = fs.statSync(path.join(migrationsFolder, 'sqls'));
      Code.expect(stats.isDirectory()).to.be.true();
    });

    lab.test('will create a new migrations/sqls/<files>', () => {
      const files = fs.readdirSync(path.join(migrationsFolder, 'sqls'));
      const upFile = files.find(file => /third-migration-up\.sql$/.test(file));
      const downFile = files.find(file => /third-migration-down\.sql$/.test(file));

      Code.expect(upFile).to.exist();
      Code.expect(downFile).to.exist();
    });
  });

  lab.experiment('with coffee-file option set to true from config file', () => {
    let exitCode;

    lab.before(async () => {
      const configOption =
        `--config=${path.join(__dirname, 'database_with_coffee_file.json')}`
      ;
      await wipeMigrations();
      exitCode = await dbMigrate('create', 'fourth migration', configOption);
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will create a new coffeescript migrations/<files>', () => {
      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => /fourth-migration\.coffee$/.test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));

      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });
  });

  lab.experiment('with coffee-file option set to true as a command parameter', () => {
    let exitCode;

    lab.before(async () => {
      const configOption = path.join('--coffee-file');

      await wipeMigrations();
      exitCode = await dbMigrate('create', 'fifth migration', configOption);
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will create a new migrations/<files>', () => {
      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find((file) => /fifth-migration\.coffee$/.test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));

      Code.expect(migrationFile).to.exist();
      Code.expect(packageJsonFile).to.exist();
    });
  });

  lab.experiment('with scoped migration', () => {
    lab.experiment('without a migration directory', () => {
      let exitCode;

      lab.before(async () => {
        await wipeMigrations();
        const configOption = path.join('--sql-file');
        exitCode = await dbMigrate('create', 'test/first migration', configOption);
      });

      lab.test('does not cause an error', () => {
        Code.expect(exitCode).to.equal(0);
      });

      lab.test('will create a new migration directory', () => {
        const stats = fs.statSync(path.join(__dirname, 'migrations/test'));
        Code.expect(stats.isDirectory()).to.be.true();
      });

      lab.test('will create a new migrations/<files>', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations/test'));
        const migrationFile = files.find((file) => /first-migration\.js$/.test(file));
        const packageJsonFile = files.find((file) => /package\.json$/.test(file));

        Code.expect(migrationFile).to.exist();
        Code.expect(packageJsonFile).to.exist();
      });

      lab.test('will create a new migration/test/sqls directory', () => {
        const stats = fs.statSync(path.join(__dirname, 'migrations/test/sqls'));
        Code.expect(stats.isDirectory()).to.be.true();
      });

      lab.test('will create a new migrations/test/sqls/<files>', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations/test/sqls'));
        const upFile = files.find(file => /first-migration-up\.sql$/.test(file));
        const downFile = files.find(file => /first-migration-down\.sql$/.test(file));

        Code.expect(upFile).to.exist();
        Code.expect(downFile).to.exist();
      });
    });
  });

  lab.experiment('with existing migrations/package.json bad file', () => {
    let exitCode;

    lab.before(async () => {
      await wipeMigrations();
      await mkdirp(migrationsFolder);
      await writeFile(
        path.join(migrationsFolder, 'package.json'),
        `{"invalidFormat`
      );
      exitCode = await dbMigrate('create', 'first fail migration');
    });

    lab.test('does cause an error and exits', () => {
      Code.expect(exitCode).to.equal(1);
    });

    lab.test('did create the new migrations/<files>', () => {
      const files = fs.readdirSync(migrationsFolder);
      const migrationFile = files.find(file => /first-fail-migration\.js$/.test(file));
      const packageJsonFile = files.find((file) => /package\.json$/.test(file));

      Code.expect(migrationFile).to.not.exist();
      Code.expect(packageJsonFile).to.exist();
    });
  });

  lab.after(async () => {
    await wipeMigrations();
  });
});
