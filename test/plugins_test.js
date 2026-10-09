const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const log = require('db-migrate-shared').log;
const DBMigrate = require('../');

const { expect } = Code;

const plugin = (dir, name, code) => {
  fs.mkdirSync(path.join(dir, 'node_modules', name), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'node_modules', name, 'package.json'),
    JSON.stringify({ name, main: 'index.js' })
  );
  fs.writeFileSync(path.join(dir, 'node_modules', name, 'index.js'), code);
};

lab.experiment('plugins', () => {
  let dir;

  lab.afterEach(() => {
    sinon.restore();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  lab.test('are found when hoisted in a monorepo, broken ones are skipped', () => {
    const warn = sinon.stub(log, 'warn');
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-plugins-'));
    const app = path.join(dir, 'packages', 'app');
    fs.mkdirSync(app, { recursive: true });
    fs.writeFileSync(
      path.join(app, 'package.json'),
      JSON.stringify({
        dependencies: { 'db-migrate-plugin-hello': '*', 'db-migrate-plugin-broken': '*' }
      })
    );

    plugin(dir, 'db-migrate-plugin-hello', `
module.exports = {
  hooks: ['run:default:action:hello:overwrite'],
  loadPlugin () {}
};`);
    plugin(dir, 'db-migrate-plugin-broken', "throw new Error('boom');");

    const dbm = DBMigrate.getInstance(true, {
      cwd: app,
      throwUncatched: true,
      config: { dev: { driver: 'sqlite3', filename: ':memory:' } }
    });

    expect(dbm.internals.plugins.overwrite('run:default:action:hello:overwrite')).to.exist();
    expect(warn.calledWithMatch(/Could not load the plugin db-migrate-plugin-broken: boom/)).to.be.true();
  });
});
