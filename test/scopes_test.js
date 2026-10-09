'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const proxyquire = require('proxyquire').noPreserveCache();
const eachScope = require('../lib/commands/helper/scopes.js');

const migrationsDir = folders => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-scopes-'));
  folders.forEach(folder => fs.mkdirSync(path.join(dir, folder), { recursive: true }));
  return dir;
};

lab.experiment('scopes', function () {
  lab.test('should run every scope for all, sqls folders are no scopes', async () => {
    const dir = migrationsDir(['b', 'a/nested', 'sqls', 'a/sqls']);
    const internals = {
      migrationMode: 'all',
      argv: { 'migrations-dir': dir, 'force-exit': true }
    };
    const runs = [];

    const results = await eachScope(internals, async () => {
      runs.push([internals.migrationMode, internals.matching, internals.argv['force-exit']]);
      return [internals.matching];
    });

    Code.expect(runs).to.equal([
      [undefined, '', false],
      ['a', 'a', false],
      ['a/nested', 'a/nested', false],
      ['b', 'b', true]
    ]);
    Code.expect(results).to.equal(['', 'a', 'a/nested', 'b']);
    Code.expect(internals.migrationMode).to.equal('all');
    Code.expect(internals.argv['force-exit']).to.equal(true);
  });

  lab.test('should run a single scope once', async () => {
    const internals = { migrationMode: 'a', argv: {} };
    let runs = 0;

    Code.expect(await eachScope(internals, async () => ++runs)).to.equal(1);
    Code.expect(runs).to.equal(1);
  });

  lab.experiment('connect', function () {
    const setup = (scope, config) => {
      const dir = migrationsDir([scope]);
      fs.writeFileSync(path.join(dir, scope, 'config.json'), JSON.stringify(config));
      const connections = [];
      const connect = proxyquire('../connect.js', {
        './lib/driver': {
          connect: (conf, internals, cb) => {
            const db = {
              conf,
              switched: null,
              close: cb => cb && cb(),
              switchDatabase: (to, cb) => {
                db.switched = to;
                cb(null);
              }
            };
            connections.push(db);
            cb(null, db);
          }
        }
      });
      const internals = { migrationMode: scope, argv: { 'migrations-dir': dir } };
      const Walker = function (db, dir, mode, internals, prefix, opts) {
        this.db = db;
        this.db2 = opts.db2;
      };

      return { connect, connections, internals, Walker };
    };

    lab.test('should switch both lines for a scope with database or schema', async () => {
      const { connect, connections, internals, Walker } = setup('shop', { schema: 'shop' });

      await connect.connect({ config: { host: 'h' }, internals }, Walker);

      Code.expect(connections.map(db => db.switched)).to.equal([
        { schema: 'shop' },
        { schema: 'shop' }
      ]);
      Code.expect(internals.locTitle).to.equal('shop');
    });

    lab.test('should connect on its own for a scope with connection settings', async () => {
      process.env.DBM_SCOPE_TEST_PW = 'secret';
      const { connect, connections, internals, Walker } = setup('analytics', {
        database: 'analytics',
        password: { ENV: 'DBM_SCOPE_TEST_PW' }
      });

      await connect.connect(
        { config: { host: 'h', database: 'main', user: 'u' }, internals },
        Walker
      );

      Code.expect(connections.map(db => db.conf)).to.equal([
        { host: 'h', database: 'analytics', user: 'u', password: 'secret' },
        { host: 'h', database: 'analytics', user: 'u', password: 'secret' }
      ]);
      Code.expect(connections.every(db => db.switched === null)).to.be.true();
    });
  });
});
