const Promise = require('bluebird');
const Code = require('code');
const Lab = require('lab');
const proxyquire = require('proxyquire').noPreserveCache();
const lab = (exports.lab = Lab.script());

lab.experiment('migrators', function () {
  lab.experiment('check', function () {
    lab.test('should return the migrations to be run', function (done) {
      const completedMigration = {
        name: '20180330020329-thisMigrationIsCompleted'
      };
      const uncompletedMigration = {
        name: '20180330020330-thisMigrationIsNotCompleted'
      };
      const Migrator = proxyquire('../lib/walker.js', {
        './file.js': {
          loadFromFileystem: (migrationsDir, prefix, internals) => {
            return Promise.resolve([uncompletedMigration]);
          },
          loadFromDatabase: (migrationsDir, prefix, driver, internals) => {
            return Promise.resolve([completedMigration]);
          }
        }
      });
      Migrator.prototype.check(null, function (err, res) {
        Code.expect(res.length).to.equal(1);
        Code.expect(res[0].name).to.equal(uncompletedMigration.name);
        done(err, res);
      });
    });
  });
});
