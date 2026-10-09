const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const sqlite3 = require('sqlite3');
const log = require('db-migrate-shared').log;
const DBMigrate = require('../');

const { expect } = Code;

const v2 = (body, release, type) => `
exports.migrate = async db => {
${body}
};
exports._meta = { version: 2${release !== undefined ? `, release: ${JSON.stringify(release)}` : ''}${type ? `, type: '${type}'` : ''} };
`;

const project = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-release-'));
  fs.mkdirSync(path.join(dir, 'migrations'));
  let n = 0;

  const instance = (cmdOptions = {}) => {
    const dbm = DBMigrate.getInstance(true, {
      cwd: dir,
      env: 'dev',
      throwUncatched: true,
      noPlugins: true,
      cmdOptions,
      config: { dev: { driver: 'sqlite3', filename: path.join(dir, 'db') } }
    });
    dbm.silence(true);
    return dbm;
  };

  const query = sql =>
    new Promise((resolve, reject) => {
      const db = new sqlite3.Database(path.join(dir, 'db'));
      db.all(sql, (err, rows) => {
        db.close();
        return err ? reject(err) : resolve(rows);
      });
    });

  return {
    add: (body, release, type) => {
      n++;
      fs.writeFileSync(
        path.join(dir, 'migrations', `202610090000${String(n).padStart(2, '0')}-m${n}.js`),
        v2(body, release, type)
      );
    },
    up: (options, ...args) => instance(options).up(...args),
    down: (...args) => instance().down(...args),
    fix: () => instance().fix(),
    schema: async () =>
      Object.keys(JSON.parse((await query("SELECT value FROM migrations_state WHERE key = '__dbmigrate_schema__'"))[0].value).c)
        .map(t => t.replace(/_\d+$/, '_T'))
        .sort(),
    check: () => instance({ check: true }).check(),
    tables: async () =>
      (await query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'migrations%' AND name != 'sqlite_sequence' ORDER BY name"))
        .map(r => r.name.replace(/_\d+$/, '_T')),
    // sorted, a column added back by reverting comes last
    columns: async t =>
      (await query(`PRAGMA table_info(${t})`))
        .map(r => ({ name: r.name.replace(/_\d+$/, '_T'), notnull: r.notnull }))
        .sort((a, b) => (a.name < b.name ? -1 : 1)),
    query,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
};

lab.experiment('releases', { timeout: 20000 }, () => {
  let p;

  lab.afterEach(() => {
    sinon.restore();
    p.cleanup();
  });

  lab.test('rename deprecated tables with the next release, drop them later', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true } });\n  await db.createTable('owners', { id: { type: 'int', primaryKey: true } });", 'r1');
    p.add("await db.deprecateTable('pets', { releases: 2, drop: 'auto' });");
    await p.up();
    expect(await p.tables()).to.equal(['owners', 'pets']);

    // the next release renames it
    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up();
    expect(await p.tables()).to.equal(['__dbm_deprecated_pets_T', 'a', 'owners']);

    // a migration of the same release changes nothing
    p.add("await db.createTable('b', { id: 'int' });");
    await p.up();
    expect(await p.tables()).to.equal(['__dbm_deprecated_pets_T', 'a', 'b', 'owners']);

    // two releases later it is dropped
    p.add("await db.createTable('c', { id: 'int' });", 'r3');
    await p.up();
    expect(await p.tables()).to.equal(['a', 'b', 'c', 'owners']);

    // reverting the first migration of a release reverts its steps
    await p.down();
    expect(await p.tables()).to.equal(['__dbm_deprecated_pets_T', 'a', 'b', 'owners']);
    await p.down();
    expect(await p.tables()).to.equal(['__dbm_deprecated_pets_T', 'a', 'owners']);
    await p.down();
    expect(await p.tables()).to.equal(['owners', 'pets']);
    await p.down();
    await p.up();
    expect(await p.tables()).to.equal(['a', 'b', 'c', 'owners']);
  });

  lab.test('columns are relaxed, renamed and dropped by hand', async () => {
    const warn = sinon.spy(log, 'warn');
    p = project();
    // relaxing notNull needs changeColumn, which sqlite does not have
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, name: 'string' });", 'r1');
    p.add("await db.deprecateColumn('pets', 'name', { releases: 1 });");
    await p.up();

    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up();
    expect((await p.columns('pets')).map(c => c.name)).to.equal(['__dbm_deprecated_name_T', '__dbmigrate__flag', 'id']);

    // due, but manual: warned only
    expect(warn.args.some(a => /column "name" of "pets" is due for dropping/.test(a[0]))).to.be.true();

    p.add("await db.dropDeprecated();");
    await p.up();
    expect((await p.columns('pets')).map(c => c.name)).to.equal(['__dbmigrate__flag', 'id']);

    await p.down();
    expect((await p.columns('pets')).map(c => c.name)).to.equal(['__dbm_deprecated_name_T', '__dbmigrate__flag', 'id']);
    await p.down(2);
    expect((await p.columns('pets')).map(c => c.name)).to.equal(['__dbmigrate__flag', 'id', 'name']);
  });

  lab.test('the order of the releases counts, not their labels', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true } });\n  await db.deprecateTable('pets', { releases: 1, drop: 'auto' });", '9.0');
    p.add("await db.createTable('a', { id: 'int' });", '1.0');
    await p.up();
    expect(await p.tables()).to.equal(['a']);
  });

  lab.test('the project sets the defaults', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true } });\n  await db.deprecateTable('pets');", 'a');
    p.add("await db.createTable('a', { id: 'int' });", 'b');
    await p.up({ deprecation: { releases: 1, drop: 'auto' } });
    expect(await p.tables()).to.equal(['a']);
  });

  lab.test('rows deleted in soft mode are purged with a later release', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, deleted_at: 'datetime' });", 'r1');
    p.add("await db.insert('pets', [{ id: 1 }, { id: 2 }, { id: 3 }]);\n  await db.delete('pets', { id: [1, 2] }, { mode: 'soft', column: 'deleted_at', purge: { releases: 1, drop: 'auto' } });", undefined, 'dml');
    await p.up();
    expect((await p.query('SELECT id FROM pets')).length).to.equal(3);

    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up();
    expect(await p.query('SELECT id FROM pets')).to.equal([{ id: 3 }]);
    expect(await p.query("SELECT value FROM migrations_state WHERE key = '__dbmigrate_purges__'")).to.equal([{ value: '{}' }]);

    // purged for good, the release can not be reverted, nothing is reverted
    await expect(p.down()).to.reject(Error, /Release r2 can not be reverted, it purged "pets"/);
    expect((await p.tables())).to.include('a');
  });

  lab.test('manual purges are warned about until purged', async () => {
    const warn = sinon.spy(log, 'warn');
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, deleted_at: 'datetime' });", 'r1');
    p.add("await db.insert('pets', [{ id: 1 }, { id: 2 }]);\n  await db.delete('pets', { id: 1 }, { mode: 'soft', column: 'deleted_at', purge: true });", undefined, 'dml');
    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up({ deprecation: { releases: 1 } });
    expect((await p.query('SELECT id FROM pets')).length).to.equal(2);
    expect(warn.args.some(a => /rows of "pets" deleted in soft mode by 20261009000002-m2#2 are due/.test(a[0]))).to.be.true();

    warn.resetHistory();
    p.add("await db.purge('pets', '20261009000002-m2');", undefined, 'dml');
    await p.up({ deprecation: { releases: 1 } });
    expect(await p.query('SELECT id FROM pets')).to.equal([{ id: 2 }]);
    expect(warn.args.some(a => /due for purging/.test(a[0]))).to.be.false();
  });

  lab.test('reverting a soft delete forgets its purge', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, deleted_at: 'datetime' });", 'r1');
    p.add("await db.insert('pets', [{ id: 1 }]);\n  await db.delete('pets', { id: 1 }, { mode: 'soft', column: 'deleted_at', purge: { releases: 1, drop: 'auto' } });", undefined, 'dml');
    await p.up();
    await p.down();
    expect(await p.query("SELECT value FROM migrations_state WHERE key = '__dbmigrate_purges__'")).to.equal([{ value: '{}' }]);

    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up(undefined, 1);
    p.add("await db.delete('pets', {}, { mode: 'soft', column: 'deleted_at', purge: 'soon' });", undefined, 'dml');
    await expect(p.up()).to.reject(Error, /takes purge: true or/);
  });

  lab.test('fix learns the steps of the releases again', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true } });\n  await db.createTable('owners', { id: { type: 'int', primaryKey: true } });\n  await db.deprecateTable('pets', { releases: 2, drop: 'auto' });\n  await db.deprecateTable('owners');", 'r1');
    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    p.add("await db.createTable('b', { id: 'int' });", 'r3');
    await p.up();
    expect(await p.tables()).to.equal(['__dbm_deprecated_owners_T', 'a', 'b']);

    const before = await p.schema();
    await p.fix();
    expect(await p.schema()).to.equal(before);
    expect(before).to.equal(['__dbm_deprecated_owners_T', 'a', 'b']);

    // reverting works on the schema learned again
    await p.down(2);
    expect(await p.tables()).to.equal(['owners', 'pets']);
    await p.down();
    expect(await p.tables()).to.equal([]);
  });

  lab.test('fix learns the records once, from an empty schema', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true } });\n  await db.addColumn('pets', 'name', 'string');");
    p.add("await db.createTable('owners', { id: 'int' });");
    await p.up();
    await p.fix();
    await p.fix();

    const [row] = await p.query("SELECT value FROM migrations_state WHERE key = '20261009000001-m1'");
    expect(JSON.parse(row.value).s.length).to.equal(2);

    await p.down(2);
    expect(await p.tables()).to.equal([]);
  });

  lab.test('backups are dropped once their migration is final', async () => {
    const backups = async () =>
      (await p.query("SELECT name FROM sqlite_master WHERE name LIKE '__dbm_backup%'")).length;
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, kind: 'string' });", 'r1');
    p.add("await db.insert('pets', [{ id: 1, kind: 'dog' }, { id: 2, kind: 'cat' }]);\n  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });\n  await db.delete('pets', { kind: 'cat' });", undefined, 'dml');
    await p.up({ deprecation: { releases: 1, drop: 'auto' } });
    expect(await backups()).to.equal(2);

    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up({ deprecation: { releases: 1, drop: 'auto' } });
    expect(await backups()).to.equal(0);
    expect(await p.query("SELECT value FROM migrations_state WHERE key = '__dbmigrate_backups__'")).to.equal([{ value: '{}' }]);

    // the data migration is final now
    await p.down();
    await expect(p.down()).to.reject(Error, /can not be reverted/);
  });

  lab.test('manual backups are warned about until dropped', async () => {
    const warn = sinon.spy(log, 'warn');
    const backups = async () =>
      (await p.query("SELECT name FROM sqlite_master WHERE name LIKE '__dbm_backup%'")).length;
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, kind: 'string' });", 'r1');
    p.add("await db.insert('pets', [{ id: 1, kind: 'dog' }]);\n  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });", undefined, 'dml');
    p.add("await db.createTable('a', { id: 'int' });", 'r2');
    await p.up({ deprecation: { releases: 1 } });
    expect(await backups()).to.equal(1);
    expect(warn.args.some(a => /backups of 20261009000002-m2 are due/.test(a[0]))).to.be.true();

    warn.resetHistory();
    p.add("await db.dropBackups();", undefined, 'dml');
    await p.up({ deprecation: { releases: 1 } });
    expect(await backups()).to.equal(0);
    expect(warn.args.some(a => /backups of/.test(a[0]))).to.be.false();
    await expect(p.down()).to.reject(Error, /can not be reverted/);
  });

  lab.test('reverting forgets the backups', async () => {
    p = project();
    p.add("await db.createTable('pets', { id: { type: 'int', primaryKey: true }, kind: 'string' });");
    p.add("await db.insert('pets', [{ id: 1, kind: 'dog' }]);\n  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });", undefined, 'dml');
    await p.up();
    await p.down();
    expect(await p.query("SELECT value FROM migrations_state WHERE key = '__dbmigrate_backups__'")).to.equal([{ value: '{}' }]);
  });

  lab.test('refuses what it does not know', async () => {
    p = project();
    p.add("await db.deprecateTable('nope');");
    await expect(p.up()).to.reject(Error, /The table "nope" is unknown/);
    p.cleanup();

    p = project();
    p.add("await db.createTable('pets', { id: 'int' });\n  await db.deprecateColumn('pets', 'nope');");
    await expect(p.up()).to.reject(Error, /The column "nope" of "pets" is unknown/);
    p.cleanup();

    p = project();
    p.add("await db.createTable('pets', { id: 'int' });\n  await db.dropDeprecated('pets');");
    await expect(p.up()).to.reject(Error, /is not deprecated/);
    p.cleanup();

    p = project();
    p.add("await db.createTable('pets', { id: 'int' });\n  await db.deprecateTable('pets', { drop: 'never' });");
    await expect(p.up()).to.reject(Error, /drop is 'auto' or 'manual'/);
    p.cleanup();

    p = project();
    p.add("await db.createTable('pets', { id: 'int' });\n  await db.deprecateTable('pets', { releases: 0 });");
    await expect(p.up()).to.reject(Error, /at least 1/);
  });
});
