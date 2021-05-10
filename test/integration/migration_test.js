'use stricts';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Promise = require('bluebird');
const proxyquire = require('proxyquire').noPreserveCache();
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const dbmUtil = require('db-migrate-shared').util;
const mkdirp = Promise.promisify(require('mkdirp'));
const rmdir = Promise.promisify(require('rimraf'));
const writeFile = Promise.promisify(fs.writeFile);
const log = require('db-migrate-shared').log;

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
lab.experiment(('migrate'), () => {
  lab.experiment(('with an empty migration'), () => {
    lab.before(async () => {
      await wipeMigrations();
      await dbMigrate('create', 'emptyMigration');
    });

    lab.test('up does not cause an error', async () => {
      const exitCode = await dbMigrate('up');
      Code.expect(exitCode).to.equal(0);
    });

    lab.test('down does not cause an error', async () => {
      const exitCode = await dbMigrate('down');
      Code.expect(exitCode).to.equal(0);
    });
  });

  lab.after(async () => {
    await wipeMigrations();
  });
});

// lab.experiment('with sql-file command option and a bad migration, causes an exit', () => {
//   let exitCode;

//   lab.before(async () => {
//     const configOption = path.join('--sql-file');
//     await wipeMigrations();
//     dbMigrate('create', 'fail migration 2', configOption)
//       .on('exit', () => {
//         const files = fs.readdirSync(migrationsFolder);
//         for (let i = 0; i < files.length; i++) {
//           const file = files[i];
//           const stats = fs.statSync(path.join(migrationsFolder, file));

//           if (stats.isFile() && file.match(/fail-migration-2\.js$/)) {
//             fs.writeFileSync(path.join(migrationsFolder, file), 'asdfghij;');
//           }
//         }
//       });

//     const codePromise = new Promise((resolve) => {
//       dbMigrate('up').on('exit', resolve);
//     });

//     exitCode = await codePromise;
//   });

//   lab.test('does cause an error', () => {
//     Code.expect(exitCode).to.equal(1);
//   });

//   lab.test('did create the new migrations/<files>', () => {
//     const files = fs.readdirSync(migrationsFolder);
//     const migrationFile = files.find(file => /fail-migration-2\.js$/.test(file));
//     const packageJsonFile = files.find((file) => /package\.json$/.test(file));

//     Code.expect(migrationFile).to.exist();
//     Code.expect(packageJsonFile).to.exist();
//   });
// });

//#endregion
