'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const util = require('util');
const dbmUtil = require('db-migrate-shared').util;

const rmdir = util.promisify(require('rimraf'));

function wipeMigrations () {
  const dir = path.join(__dirname, 'migrations');
  return rmdir(dir);
}

function dbMigrate () {
  const args = dbmUtil.toArray(arguments);
  const dbm = path.join(__dirname, '..', '..', 'bin', 'db-migrate');
  args.unshift(dbm);
  return cp.spawn('node', args, { cwd: __dirname });
}

lab.experiment('create', function () {
  lab.experiment('without a migration directory', () => {
    let exitCode;

    lab.before(async () => {
      await wipeMigrations();

      const db = dbMigrate('create', 'first migration');
      // db.stderr.on('data', data => console.log(data.toString()));
      // db.stdout.on('data', data => console.log(data.toString()));

      const exitCodePromise = new Promise((resolve) => db.on('exit', resolve));
      exitCode = await exitCodePromise;
    });

    lab.test('does not cause an error', () => {
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('will create a new migration directory', () => {
      const stats = fs.statSync(path.join(__dirname, 'migrations'));
      Code.expect(stats.isDirectory()).to.be.true();
    });

    lab.test('will create a new migration', () => {
      const files = fs.readdirSync(path.join(__dirname, 'migrations'));
      Code.expect(files.length).to.equal(1);
      const file = files[0];
      Code.expect(file).to.match(/first-migration\.js$/);
    });
  });

  lab.experiment(
    'with sql-file option set to true from config file', () => {
      let exitCode;

      lab.before(async () => {
        const configOption = path.join(
          '--config=',
          __dirname,
          'database_with_sql_file.json'
        );

        await wipeMigrations();
        const exitCodePromise = new Promise((resolve) => {
          dbMigrate('create', 'second migration', configOption)
            .on('exit', resolve);
        });
        exitCode = await exitCodePromise;
      });

      lab.test('does not cause an error', () => {
        Code.expect(exitCode).to.equal(0);
      });

      lab.test('will create a new migration', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations'));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const stats = fs.statSync(path.join(__dirname, 'migrations', file));
          if (stats.isFile()) {
            Code.expect(file).to.match(/second-migration\.js$/);
          }
        }
      });

      lab.test('will create a new migration/sqls directory', () => {
        const stats = fs.statSync(path.join(__dirname, 'migrations/sqls'));
        Code.expect(stats.isDirectory()).to.be.true();
      });

      lab.test('will create a new migration sql up file', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations/sqls'));
        Code.expect(files.length).to.equal(2);
        const file = files[1];
        Code.expect(file).to.match(/second-migration-up\.sql$/);
      });
    }
  );

  lab.experiment(
    'with sql-file option set to true as a command parameter', () => {
      let exitCode;

      lab.before(async () => {
        const configOption = path.join('--sql-file');

        await wipeMigrations();
        const exitCodePromise = new Promise((resolve) => {
          dbMigrate('create', 'third migration', configOption).on('exit', resolve);
        });

        exitCode = await exitCodePromise;
      });

      lab.test('does not cause an error', () => {
        Code.expect(exitCode).to.equal(0);
      });

      lab.test('will create a new migration', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations'));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const stats = fs.statSync(path.join(__dirname, 'migrations', file));
          if (stats.isFile()) {
            Code.expect(file).to.match(/third-migration\.js$/);
          }
        }
      });

      lab.test('will create a new migration/sqls directory', () => {
        const stats = fs.statSync(path.join(__dirname, 'migrations/sqls'));
        Code.expect(stats.isDirectory()).to.be.true();
      });

      lab.test('will create a new migration sql up file', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations/sqls'));
        Code.expect(files.length).to.equal(2);
        const file = files[1];
        Code.expect(file).to.match(/third-migration-up\.sql$/);
      });
    }
  );

  lab.experiment(
    'with coffee-file option set to true from config file', () => {
      let exitCode;

      lab.before(async () => {
        const configOption = path.join(
          '--config=',
          __dirname,
          'database_with_coffee_file.json'
        );

        await wipeMigrations();
        const exitCodePromise = new Promise((resolve) => {
          dbMigrate('create', 'fourth migration', configOption).on('exit', resolve);
        });
        exitCode = await exitCodePromise;
      });

      lab.test('does not cause an error', () => {
        Code.expect(exitCode).to.equal(0);
      });

      lab.test('will create a new coffeescript migration', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations'));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const stats = fs.statSync(path.join(__dirname, 'migrations', file));
          if (stats.isFile()) {
            Code.expect(file).to.match(/fourth-migration\.coffee$/);
          }
        }
      });
    }
  );
  lab.experiment(
    'with scoped migration', () => {
      lab.experiment('without a migration directory', () => {
        let exitCode;

        lab.before(async () => {
          await wipeMigrations();
          const configOption = path.join('--sql-file');
          const db = dbMigrate('create', 'test/first migration', configOption);
          // db.stderr.on('data', data => console.log(data.toString()));
          // db.stdout.on('data', data => console.log(data.toString()));

          const exitCodePromise = new Promise((resolve) => db.on('exit', resolve));
          exitCode = await exitCodePromise;
        });

        lab.test('does not cause an error', () => {
          Code.expect(exitCode).to.equal(0);
        });

        lab.test('will create a new migration directory', () => {
          const stats = fs.statSync(path.join(__dirname, 'migrations/test'));
          Code.expect(stats.isDirectory()).to.be.true();
        });

        lab.test('will create a new migration', () => {
          const files = fs.readdirSync(path.join(__dirname, 'migrations/test'));
          Code.expect(files.length).to.equal(2);
          const file = files[0];
          Code.expect(file).to.match(/first-migration\.js$/);
        });
        lab.test('will create a new migration/test/sqls directory', () => {
          const stats = fs.statSync(path.join(__dirname, 'migrations/test/sqls'));
          Code.expect(stats.isDirectory()).to.be.true();
        });
        lab.test('will create a new migration sql up file', () => {
          const files = fs.readdirSync(path.join(__dirname, 'migrations/test/sqls'));
          Code.expect(files.length).to.equal(2);
          const file = files[1];
          Code.expect(file).to.match(/first-migration-up\.sql$/);
        });
      });
    }
  );

  lab.experiment(
    'with coffee-file option set to true as a command parameter', () => {
      let exitCode;

      lab.before(async () => {
        const configOption = path.join('--coffee-file');

        await wipeMigrations();

        const exitCodePromise = new Promise((resolve) => {
          dbMigrate('create', 'fifth migration', configOption).on('exit', resolve);
        });
        exitCode = await exitCodePromise;
      });

      lab.test('does not cause an error', () => {
        Code.expect(exitCode).to.equal(0);
      });

      lab.test('will create a new coffeescript migration', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations'));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const stats = fs.statSync(path.join(__dirname, 'migrations', file));
          if (stats.isFile()) {
            Code.expect(file).to.match(/fifth-migration\.coffee$/);
          }
        }
      });
    }
  );

  lab.experiment(
    'with sql-file and a bad migration, causes an exit', () => {
      let exitCode;

      lab.before(async () => {
        const configOption = path.join('--sql-file');

        await wipeMigrations();

        dbMigrate('create', 'sixth migration', configOption).on('exit', () => {
          const files = fs.readdirSync(path.join(__dirname, 'migrations'));

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const stats = fs.statSync(
              path.join(__dirname, 'migrations', file)
            );

            if (stats.isFile() && file.match(/sixth-migration\.js$/)) {
              fs.writeFileSync(
                path.join(__dirname, 'migrations', file),
                'asdfghij;'
              );
            }
          }
        });

        const codePromise = new Promise((resolve) => {
          dbMigrate('up').on('exit', resolve);
        });

        exitCode = await codePromise;
      });

      lab.test('does cause an error', () => {
        Code.expect(exitCode).to.equal(1);
      });

      lab.test('did create the new migration', () => {
        const files = fs.readdirSync(path.join(__dirname, 'migrations'));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const stats = fs.statSync(path.join(__dirname, 'migrations', file));
          if (stats.isFile()) {
            Code.expect(file).to.match(/sixth-migration\.js$/);
          }
        }
      });

      lab.after(() => {
        cp.exec('rm -r ' + path.join(__dirname, 'migrations'));
      });
    }
  );
});
