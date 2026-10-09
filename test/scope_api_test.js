const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');
const DBMigrate = require('../');

const { expect } = Code;

const v2 = table => `
exports.migrate = async db => {
  await db.createTable('${table}', { id: 'int' });
};
exports._meta = { version: 2 };
`;

const project = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-scope-'));
  fs.mkdirSync(path.join(dir, 'migrations', 'test'), { recursive: true });
  ['a', 'b', 'c'].forEach((t, i) =>
    fs.writeFileSync(path.join(dir, 'migrations', 'test', `2026100900000${i + 1}-${t}.js`), v2(t))
  );
  fs.writeFileSync(path.join(dir, 'migrations', '20261009000009-root.js'), v2('root'));

  const dbm = DBMigrate.getInstance(true, {
    cwd: dir,
    env: 'dev',
    throwUncatched: true,
    noPlugins: true,
    config: { dev: { driver: 'sqlite3', filename: path.join(dir, 'db') } }
  });
  dbm.silence(true);

  const tables = () =>
    new Promise((resolve, reject) => {
      const db = new sqlite3.Database(path.join(dir, 'db'));
      db.all(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'migrations%' AND name != 'sqlite_sequence' ORDER BY name",
        (err, rows) => {
          db.close();
          return err ? reject(err) : resolve(rows.map(r => r.name));
        }
      );
    });

  return { dbm, tables, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
};

lab.experiment('scopes with one instance of the API', { timeout: 20000 }, () => {
  let p;

  lab.afterEach(() => p.cleanup());

  lab.test('runs each call in its own scope and count', async () => {
    p = project();
    const { dbm } = p;

    await dbm.up(1, 'test');
    expect(await p.tables()).to.equal(['a']);

    // neither the scope nor the count carry over
    await dbm.up();
    expect(await p.tables()).to.equal(['a', 'root']);
    await dbm.up(undefined, 'test');
    expect(await p.tables()).to.equal(['a', 'b', 'c', 'root']);

    // sync and fix in a scope find the migrations of the scope
    await dbm.sync('20261009000001-a', 'test');
    expect(await p.tables()).to.equal(['a', 'root']);
    await dbm.sync('20261009000003-c', 'test');
    expect(await p.tables()).to.equal(['a', 'b', 'c', 'root']);
    await dbm.fix(undefined, 'test');

    await dbm.down(1, 'test');
    expect(await p.tables()).to.equal(['a', 'b', 'root']);
    await dbm.reset();
    expect(await p.tables()).to.equal(['a', 'b']);
    await dbm.reset('test');
    expect(await p.tables()).to.equal([]);
  });
});
