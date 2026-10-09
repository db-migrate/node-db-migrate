const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');
const DBMigrate = require('../');

const { expect } = Code;

const SCHEMA = `
exports.migrate = async db => {
  await db.createTable('owners', {
    id: { type: 'int', primaryKey: true },
    name: 'string'
  });
  await db.createTable('pets', {
    id: { type: 'int', primaryKey: true },
    name: 'string',
    owner_id: {
      type: 'int',
      foreignKey: {
        name: 'pets_owner_fk',
        table: 'owners',
        mapping: 'id',
        rules: { onDelete: 'RESTRICT' }
      }
    }
  });
};
exports._meta = { version: 2 };
`;

const seed = body => `
exports.seed = async db => {
${body}
};
`;

const project = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-seed-'));
  fs.mkdirSync(path.join(dir, 'migrations'));
  fs.mkdirSync(path.join(dir, 'seeds'));
  fs.writeFileSync(path.join(dir, 'migrations', '20261009000001-schema.js'), SCHEMA);

  const instance = () => {
    const dbm = DBMigrate.getInstance(true, {
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
    write: (name, code) =>
      fs.writeFileSync(path.join(dir, 'seeds', `${name}.js`), code),
    unlink: name => fs.unlinkSync(path.join(dir, 'seeds', `${name}.js`)),
    up: () => instance().up(),
    down: () => instance().down(),
    seed: name => instance().seed(name),
    undo: name => instance().undoSeed(name),
    reset: () => instance().resetSeed(),
    rows: table =>
      query(`SELECT id, name, __dbmigrate__flag AS f FROM ${table} ORDER BY id`),
    query,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
};

lab.experiment('static seeds', { timeout: 20000 }, () => {
  let p;

  lab.beforeEach(async () => {
    p = project();
    await p.up();
  });

  lab.afterEach(() => p.cleanup());

  lab.test('insert flagged rows and replace them when seeding again', async () => {
    p.write('1-owners', seed(`
  await db.insert('owners', [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }]);`));
    p.write('2-pets', seed(`
  const owners = await db.all('SELECT id FROM owners WHERE id < 9');
  await db.insert('pets', owners.map(o => ({ id: o.id, name: 'pet' + o.id, owner_id: o.id })));`));

    // rows of others stay untouched
    await p.query("INSERT INTO owners (id, name) VALUES (9, 'mine')");

    await p.seed();
    expect(await p.rows('owners')).to.equal([
      { id: 1, name: 'Ann', f: 'seed:1-owners' },
      { id: 2, name: 'Bob', f: 'seed:1-owners' },
      { id: 9, name: 'mine', f: null }
    ]);
    expect((await p.rows('pets')).length).to.equal(2);

    // changed seeds replace their rows, the owners referenced by the pets
    // are removed after the pets
    p.write('1-owners', seed(`
  await db.insert('owners', { id: 3, name: 'Cid' });`));
    await p.seed();
    expect(await p.rows('owners')).to.equal([
      { id: 3, name: 'Cid', f: 'seed:1-owners' },
      { id: 9, name: 'mine', f: null }
    ]);
    expect(await p.rows('pets')).to.equal([
      { id: 3, name: 'pet3', f: 'seed:2-pets' }
    ]);

    // the rows of removed seeds go as well
    p.unlink('2-pets');
    await p.seed();
    expect(await p.rows('pets')).to.equal([]);

    await p.reset();
    expect(await p.rows('owners')).to.equal([{ id: 9, name: 'mine', f: null }]);
  });

  lab.test('one seed by its name', async () => {
    p.write('owners', seed(`
  await db.insert('owners', ['id', 'name'], [[1, 'Ann']]);`));
    p.write('more', seed(`
  await db.insert('owners', { columns: ['id', 'name'], data: [5, 'Eve'] });`));

    await p.seed('owners');
    expect((await p.rows('owners')).map(r => r.id)).to.equal([1]);
    await p.seed('more');
    await p.seed('owners');
    expect((await p.rows('owners')).map(r => r.id)).to.equal([1, 5]);

    await p.undo('owners');
    expect((await p.rows('owners')).map(r => r.id)).to.equal([5]);
    await expect(p.undo('owners')).to.reject(Error, /no seeded seed "owners"/);
    await expect(p.seed('nope')).to.reject(Error, /no seed "nope"/);
  });

  lab.test('a failing seed is removed with its next run', async () => {
    p.write('owners', seed(`
  await db.insert('owners', { id: 1, name: 'Ann' });
  await db.insert('owners', { id: 1, name: 'Ann again' });`));

    await expect(p.seed()).to.reject(Error, /UNIQUE/);
    expect((await p.rows('owners')).length).to.equal(1);

    p.write('owners', seed(`
  await db.insert('owners', []);
  await db.insert('owners', { id: 2, name: 'Bob' });`));
    await p.seed();
    expect((await p.rows('owners')).map(r => r.id)).to.equal([2]);
  });

  lab.test('refuses tables without the flag and seeds without seed', async () => {
    await p.query('CREATE TABLE plain (id int)');
    p.write('plain', seed(`
  await db.insert('plain', { id: 1 });`));
    await expect(p.seed()).to.reject(Error, /tables created by v2 migrations/);

    p.write('plain', 'exports.nope = 1;');
    await expect(p.seed()).to.reject(Error, /exports no seed function/);
  });

  lab.test('skips tables dropped since', async () => {
    p.write('owners', seed(`
  await db.insert('owners', { id: 1, name: 'Ann' });`));
    await p.seed();
    await p.down();
    await p.reset();
  });
});
