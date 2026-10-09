const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const sqlite3 = require('sqlite3');
const State = require('../lib/state.js');
const DBMigrate = require('../');

const { expect } = Code;

const PETS = `
exports.migrate = async db => {
  await db.createTable('pets', {
    id: { type: 'int', primaryKey: true },
    name: 'string',
    kind: 'string'
  });
  await db.createTable('logs', { line: 'string' });
};
exports._meta = { version: 2 };
`;

const DATA = `
exports.migrate = async db => {
  await db.insert('pets', ['id', 'name', 'kind'], [
    [1, 'Rex', 'dog'], [2, 'Tom', 'cat'], [3, 'Nemo', 'fish'],
    [4, 'Bello', 'dog'], [5, 'Lassie', 'dog'], [6, 'Dory', 'fish']
  ]);
};
exports._meta = { version: 2, type: 'dml' };
`;

const dml = body => `
exports.migrate = async db => {
${body}
};
exports._meta = { version: 2, type: 'dml' };
`;

const project = (...migrations) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-dml-'));
  fs.mkdirSync(path.join(dir, 'migrations'));
  migrations.forEach((code, i) => {
    fs.writeFileSync(
      path.join(dir, 'migrations', `2026100900000${i + 1}-m${i + 1}.js`),
      code
    );
  });

  const instance = (cmdOptions = {}) => {
    const dbm = DBMigrate.getInstance(true, {
      cmdOptions,
      cwd: dir,
      env: 'dev',
      throwUncatched: true,
      noPlugins: true,
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
    dir,
    up: (...args) => instance().up(...args),
    down: (...args) => instance().down(...args),
    fix: () => instance().fix(),
    dryUp: () => instance({ 'dry-run': true }).up(),
    dryDown: () => instance({ 'dry-run': true }).down(),
    pets: () => query('SELECT id, name, kind FROM pets ORDER BY id'),
    backups: () =>
      query(
        "SELECT name FROM sqlite_master WHERE name LIKE '__dbm_backup%'"
      ),
    query,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
};

const ORIGINAL = [
  { id: 1, name: 'Rex', kind: 'dog' },
  { id: 2, name: 'Tom', kind: 'cat' },
  { id: 3, name: 'Nemo', kind: 'fish' },
  { id: 4, name: 'Bello', kind: 'dog' },
  { id: 5, name: 'Lassie', kind: 'dog' },
  { id: 6, name: 'Dory', kind: 'fish' }
];

lab.experiment('dml migrations', { timeout: 20000 }, () => {
  let p;

  lab.afterEach(() => {
    sinon.restore();
    delete global.__dbmCrash;
    if (p) p.cleanup();
  });

  lab.test('change data and restore it exactly when reverted', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  await db.update('pets', { kind: 'hound', name: null }, { kind: 'dog' }, { batch: 2 });
  await db.delete('pets', "kind = 'fish'", { batch: 1 });
  await db.insert('pets', { id: 7, name: 'Garfield', kind: 'cat' });
  await db.runSql("UPDATE pets SET name = 'TOM' WHERE id = ?", [2], {
    revert: ["UPDATE pets SET name = ? WHERE id = 2", ['Tom']]
  });
  await db.update('pets', { name: 'Kitty' }, { id: [7] });
  const rows = await db.all('SELECT * FROM pets');
  if (rows.length !== 5) throw new Error('all reads the rows');`)
    );

    await p.up();
    expect(await p.pets()).to.equal([
      { id: 1, name: null, kind: 'hound' },
      { id: 2, name: 'TOM', kind: 'cat' },
      { id: 4, name: null, kind: 'hound' },
      { id: 5, name: null, kind: 'hound' },
      { id: 7, name: 'Kitty', kind: 'cat' }
    ]);
    expect((await p.backups()).length).to.equal(3);

    await p.down();
    expect(await p.pets()).to.equal(ORIGINAL);
    expect(await p.backups()).to.equal([]);

    await p.down();
    expect(await p.pets()).to.equal([]);
  });

  lab.test('rolls back the steps of a failing migration', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });
  await db.insert('pets', { id: 7, name: 'Garfield', kind: 'cat' });
  await db.insert('pets', { id: 1, name: 'Rex again', kind: 'dog' });`)
    );

    await p.up(2);
    const err = await expect(p.up()).to.reject();
    expect(err.instruction).to.equal('at step 3 insert("pets")');
    expect(await p.pets()).to.equal(ORIGINAL);
    expect(await p.backups()).to.equal([]);
    expect(
      await p.query("SELECT name FROM migrations WHERE name LIKE '%m3'")
    ).to.equal([]);
  });

  lab.test('continues an interrupted step where it stopped', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  if (global.__dbmCrash) {
    const runSql = db.driver.runSql;
    let n = 0;
    db.driver.runSql = function (sql, ...args) {
      if (/^UPDATE "pets"/.test(sql) && ++n === 2) {
        return Promise.reject(new Error('crash'));
      }
      return runSql.call(this, sql, ...args);
    };
  }
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' }, { batch: 1 });`)
    );

    await p.up(2);

    // the process dies, nothing is rolled back
    global.__dbmCrash = true;
    sinon.stub(State, 'rollingBack').rejects(new Error('killed'));
    await expect(p.up()).to.reject('killed');
    sinon.restore();
    delete global.__dbmCrash;

    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound',
      'cat',
      'fish',
      'dog',
      'dog',
      'fish'
    ]);

    await p.up();
    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound',
      'cat',
      'fish',
      'hound',
      'hound',
      'fish'
    ]);

    await p.down();
    expect(await p.pets()).to.equal(ORIGINAL);
  });

  lab.test('irreversible steps stay and refuse reverting', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  await db.insert('logs', { line: 'migrated' }, { irreversible: true });
  await db.update('logs', { line: 'x' }, {}, { irreversible: true });
  await db.delete('logs', { line: 'nothing' }, { irreversible: true });
  await db.runSql("UPDATE pets SET kind = 'dog' WHERE id = 2", { irreversible: true });
  await db.insert('pets', { id: global.__dbmCrash ? 1 : 7, name: 'Garfield', kind: 'cat' });`)
    );

    await p.up(2);
    global.__dbmCrash = true;
    await expect(p.up()).to.reject(Error, /UNIQUE/);
    delete global.__dbmCrash;

    // the steps executed stay, the next run continues after them
    expect(await p.query('SELECT line FROM logs')).to.equal([{ line: 'x' }]);
    expect((await p.pets())[1].kind).to.equal('dog');
    await p.up();
    expect(await p.query('SELECT line FROM logs')).to.equal([{ line: 'x' }]);
    expect((await p.pets()).length).to.equal(7);

    await expect(p.down()).to.reject(Error, /can not be reverted/);
    expect((await p.pets()).length).to.equal(7);
  });

  lab.test('refuses what it can not revert', async () => {
    const cases = [
      ["await db.createTable('x', {});", 'schema instruction'],
      ["await db.insert('unknown', { a: 1 });", 'tables created by v2'],
      ["await db.update('logs', { line: 'a' }, {});", 'needs the primary key'],
      ["await db.update('pets', { id: 9 }, { id: 1 });", 'can not change the key'],
      ["await db.update('pets', {}, { id: 1 });", 'needs the values'],
      ["await db.delete('pets', 42);", 'where is an object'],
      ["await db.runSql('DELETE FROM pets');", 'needs the SQL reverting it'],
      ["await db.insert('pets', ['id'], [1, 2]);", 'number of columns'],
      ["await db.insert('pets', 'x');", 'needs the rows']
    ];

    for (const [code, message] of cases) {
      p = project(PETS, dml(code));
      const err = await p.up().then(() => null, e => e);
      expect(err, code).to.be.an.error(Error, new RegExp(message));
      p.cleanup();
    }

    p = project(PETS.replace('version: 2', 'version: 2, noDefaultColumn: true'), dml("await db.insert('logs', { line: 'a' });"));
    await expect(p.up()).to.reject(Error, /which "logs" does not have/);
    p.cleanup();

    p = project(PETS, PETS.replace("version: 2", "version: 2, type: 'ddl'"));
    await expect(p.up()).to.reject(Error, /Invalid migration type "ddl"/);
  });

  lab.test('more forms of insert, where and key', async () => {
    p = project(
      PETS,
      dml(`
  await db.insert('pets', { columns: ['id', 'name', 'kind'], data: [1, 'a', 'x', 2, 'b', null] });
  await db.insert('pets', []);
  await db.update('pets', { name: 'c' }, ['kind = ?', ['x']]);
  await db.update('pets', { name: 'd' }, { kind: null, id: [] });
  await db.delete('pets', { kind: null }, { key: 'id' });`)
    );

    await p.up();
    expect(await p.pets()).to.equal([{ id: 1, name: 'c', kind: 'x' }]);
    await p.down(1);
    expect(await p.pets()).to.equal([]);
  });

  lab.test('recovers an interrupted step by rolling back', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  if (global.__dbmCrash) {
    const runSql = db.driver.runSql;
    db.driver.runSql = function (sql, ...args) {
      if (/^DELETE FROM "pets" WHERE "id"/.test(sql)) {
        return Promise.reject(new Error('crash'));
      }
      return runSql.call(this, sql, ...args);
    };
  }
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });
  await db.delete('pets', { kind: 'fish' });`).replace(
        "type: 'dml'",
        "type: 'dml', recovery: 'rollback'"
      )
    );

    await p.up(2);
    global.__dbmCrash = true;
    sinon.stub(State, 'rollingBack').rejects(new Error('killed'));
    await expect(p.up()).to.reject('killed');
    sinon.restore();
    delete global.__dbmCrash;

    // reverted first, then run again
    await p.up();
    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound',
      'cat',
      'hound',
      'hound'
    ]);
    await p.down();
    expect(await p.pets()).to.equal(ORIGINAL);
  });

  lab.test('only prints the statements in a dry run', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });
  await db.delete('pets', { kind: 'fish' });`)
    );

    await p.up(2);
    await p.dryUp();
    expect(await p.pets()).to.equal(ORIGINAL);
    expect(await p.backups()).to.equal([]);

    await p.up();
    await p.dryDown();
    expect((await p.pets()).length).to.equal(4);
    expect((await p.backups()).length).to.equal(2);
  });

  lab.test('fix skips dml migrations', async () => {
    p = project(PETS, DATA);
    await p.up();
    await p.fix();
    expect((await p.pets()).length).to.equal(6);
  });
});
