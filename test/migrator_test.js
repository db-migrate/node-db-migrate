const Promise = require('bluebird');
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const proxyquire = require('proxyquire').noPreserveCache();
const lab = (exports.lab = Lab.script());

lab.experiment('migrators', function () {
  lab.experiment('check', function () {
    lab.test('should return the migrations to be run', async () => {
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
        Code.expect(err).to.be.null();
        Code.expect(res.length).to.equal(1);
        Code.expect(res[0].name).to.equal(uncompletedMigration.name);
      });
    });
  });

  lab.experiment('lock', function () {
    const Migrator = require('../lib/walker.js');
    const pending = [{ name: '20261008000001-pending' }];

    const walker = (meta, internals = {}) => ({
      prefix: 'migration',
      title: '[migration] ',
      internals,
      _pdriver: { _meta: meta }
    });

    lab.test('should run without a lock if the driver does not support locking', async () => {
      for (const meta of [undefined, { supports: {} }, { supports: { locking: false } }]) {
        // the driver has no state methods, any lock attempt would throw
        const res = await Migrator.prototype._withLock.call(
          walker(meta),
          async () => pending,
          toRun => toRun
        );
        Code.expect(res).to.equal(pending);
      }
    });

    lab.test('should not require locking for a dry run', async () => {
      const res = await Migrator.prototype._withLock.call(
        walker(undefined, { dryRun: true }),
        async () => pending,
        toRun => toRun
      );
      Code.expect(res).to.equal(pending);
    });

    lab.test('should not lock if there is nothing to run', async () => {
      const res = await Migrator.prototype._withLock.call(
        walker({ supports: { locking: true } }),
        async () => [],
        toRun => toRun
      );
      Code.expect(res).to.equal([]);
    });
  });
});
