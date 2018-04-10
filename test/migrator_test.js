var Code = require('code');
var Lab = require('lab');
var proxyquire = require('proxyquire').noPreserveCache();
var lab = (exports.lab = Lab.script());

lab.experiment('migrators', function () {
  lab.experiment('check', function () {
    lab.test('should return the migrations to be run', function (done) {
      var completedMigration = {
        name: '20180330020329-thisMigrationIsCompleted'
      };
      var uncompletedMigration = {
        name: '20180330020330-thisMigrationIsNotCompleted'
      };
      var Migrator = proxyquire('../lib/migrator.js', {
        './migration': {
          loadFromFilesystem: (migrationsDir, internals, cb) => {
            return cb(null, [completedMigration, uncompletedMigration]);
          },
          loadFromDatabase: (migrationsDir, driver, internals, cb) => {
            return cb(null, [completedMigration]);
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
