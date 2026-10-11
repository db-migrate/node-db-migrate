const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');
const DBMigrate = require('../');
const sinon = require('sinon');
const log = require('db-migrate-shared').log;
const Jobs = require('../lib/jobs');

const { expect } = Code;

const PETS = `
exports.migrate = async db => {
  await db.createTable('pets', {
    id: { type: 'int', primaryKey: true },
    name: 'string',
    kind: 'string',
    deleted_at: 'datetime'
  });
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

const dml = (body, meta = '') => `
exports.migrate = async db => {
${body}
};
exports._meta = { version: 2, type: 'dml'${meta} };
`;

const project = (...migrations) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-work-'));
  fs.mkdirSync(path.join(dir, 'migrations'));
  const write = (i, code) =>
    fs.writeFileSync(
      path.join(dir, 'migrations', `2026100900000${i + 1}-m${i + 1}.js`),
      code
    );
  migrations.forEach((code, i) => write(i, code));

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
      // the workers write at the same time
      db.configure('busyTimeout', 5000);
      db.all(sql, (err, rows) => {
        db.close();
        return err ? reject(err) : resolve(rows);
      });
    });

  return {
    dir,
    write,
    instance,
    up: (...args) => instance().up(...args),
    down: (...args) => instance().down(...args),
    status: () => instance().status(),
    work: (options = {}) => instance().executeWork(Object.assign({ interval: 10 }, options)),
    pets: () => query('SELECT id, name, kind FROM pets ORDER BY id'),
    flags: () =>
      query('SELECT id, deleted_at IS NOT NULL AS d, __dbmigrate__flag AS f FROM pets ORDER BY id'),
    migrations: () => query('SELECT name FROM migrations ORDER BY name'),
    jobs: () =>
      query(`SELECT value FROM migrations_state WHERE key = '${Jobs.JOBS}'`).then(
        rows => (rows.length ? JSON.parse(rows[0].value).jobs : {})
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

lab.experiment('soft delete and purge', { timeout: 20000 }, () => {
  let p;

  lab.afterEach(() => p.cleanup());

  lab.test('marks the rows, reverts and purges them', async () => {
    p = project(
      PETS,
      DATA,
      dml(`
  await db.delete('pets', { kind: 'dog' }, { mode: 'soft', column: 'deleted_at', batch: 2 });
  await db.delete('pets', { kind: ['dog', 'fish'] }, { mode: 'soft', column: 'deleted_at' });`)
    );

    await p.up(2);
    await p.query("UPDATE pets SET deleted_at = '2020-01-01' WHERE id = 6");
    await p.up();
    expect(await p.flags()).to.equal([
      { id: 1, d: 1, f: '20261009000002-m2#1|del:20261009000003-m3#1' },
      { id: 2, d: 0, f: '20261009000002-m2#1' },
      { id: 3, d: 1, f: '20261009000002-m2#1|del:20261009000003-m3#2' },
      { id: 4, d: 1, f: '20261009000002-m2#1|del:20261009000003-m3#1' },
      { id: 5, d: 1, f: '20261009000002-m2#1|del:20261009000003-m3#1' },
      // deleted by the application before, untouched
      { id: 6, d: 1, f: '20261009000002-m2#1' }
    ]);

    await p.down();
    expect(await p.flags()).to.equal([
      { id: 1, d: 0, f: '20261009000002-m2#1' },
      { id: 2, d: 0, f: '20261009000002-m2#1' },
      { id: 3, d: 0, f: '20261009000002-m2#1' },
      { id: 4, d: 0, f: '20261009000002-m2#1' },
      { id: 5, d: 0, f: '20261009000002-m2#1' },
      { id: 6, d: 1, f: '20261009000002-m2#1' }
    ]);

    await p.up();
    p.write(3, dml(`
  await db.purge('pets', '20261009000003-m3', { batch: 1 });`));
    await p.up();
    expect((await p.pets()).map(r => r.id)).to.equal([2, 6]);
    await expect(p.down()).to.reject(Error, /can not be reverted/);
  });

  lab.test('needs a column and a known mode', async () => {
    p = project(PETS, dml("await db.delete('pets', {}, { mode: 'soft' });"));
    await expect(p.up()).to.reject(Error, /needs the column/);
    p.cleanup();

    p = project(PETS, dml("await db.delete('pets', {}, { mode: 'hard' });"));
    await expect(p.up()).to.reject(Error, /has no mode "hard"/);
  });
});

lab.experiment('background migrations', { timeout: 30000 }, () => {
  let p;

  lab.afterEach(() => p.cleanup());

  const BACKGROUND = dml(
    `
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' }, { batch: 1 });
  await db.delete('pets', { kind: 'fish' }, { mode: 'soft', column: 'deleted_at', batch: 1 });`,
    ', background: true'
  );

  lab.test('run as jobs of executeWork', async () => {
    p = project(PETS, DATA, BACKGROUND, dml("await db.insert('pets', { id: 7, name: 'Tim', kind: 'cat' });"));

    await p.up();
    // registered only, the following migrations run
    expect((await p.migrations()).map(m => m.name)).to.equal([
      '/20261009000001-m1',
      '/20261009000002-m2',
      '/20261009000004-m4'
    ]);
    expect((await p.jobs())['20261009000003-m3'].s).to.equal('queued');

    // running in the background, not pending
    const status = await p.status();
    expect(status.pending).to.equal([]);
    expect(status.jobs).to.equal([
      { name: '20261009000003-m3', state: 'queued', blocking: false, step: 0, done: 0, error: null }
    ]);

    // running, so up does not run or register it again
    await p.up();
    expect(Object.keys(await p.jobs())).to.equal(['20261009000003-m3']);

    const result = await p.work({ pause: 1 }).done;
    expect(result.done).to.equal(['20261009000003-m3']);
    expect(await p.jobs()).to.equal({});
    expect((await p.migrations()).length).to.equal(4);
    expect((await p.flags()).filter(r => r.d).map(r => r.id)).to.equal([3, 6]);

    await p.down(2);
    expect(await p.pets()).to.equal(ORIGINAL);
  });

  lab.test('stop and continue', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    const worker = p.work({ pause: 30, batch: 1 });
    await new Promise(resolve => setTimeout(resolve, 80));
    await worker.stop();

    const job = (await p.jobs())['20261009000003-m3'];
    expect(job.s).to.equal('queued');
    expect(job.step).to.equal(1);

    const result = await p.work().done;
    expect(result.done).to.equal(['20261009000003-m3']);
    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound', 'cat', 'fish', 'hound', 'hound', 'fish'
    ]);
  });

  lab.test('blocking jobs keep later jobs waiting', async () => {
    const timed = (id, name, wait) =>
      dml(
        `
  global.__dbmRuns.push(['${name}', 'start', Date.now()]);
  await db.update('pets', { name: '${name}' }, { id: ${id} });
  await new Promise(resolve => setTimeout(resolve, ${wait}));
  global.__dbmRuns.push(['${name}', 'end', Date.now()]);`,
        name === 'a' ? ', background: true, blocking: true' : ', background: true'
      );

    p = project(PETS, DATA, timed(1, 'a', 150), timed(2, 'b', 0), timed(3, 'c', 0));
    global.__dbmRuns = [];
    await p.up();

    const result = await p.work({ parallel: 3 }).done;
    expect(result.done.slice().sort()).to.equal([
      '20261009000003-m3',
      '20261009000004-m4',
      '20261009000005-m5'
    ]);

    const at = (name, what) =>
      global.__dbmRuns.find(r => r[0] === name && r[1] === what)[2];
    expect(at('b', 'start')).to.be.at.least(at('a', 'end'));
    expect(at('c', 'start')).to.be.at.least(at('a', 'end'));
    delete global.__dbmRuns;
  });

  lab.test('several workers run each job once', async () => {
    const job = id =>
      dml(
        `
  global.__dbmRuns.push(${id});
  await db.update('pets', { name: 'x${id}' }, { id: ${id} });`,
        ', background: true'
      );

    p = project(PETS, DATA, job(1), job(2), job(3), job(4));
    global.__dbmRuns = [];
    await p.up();

    const results = await Promise.all([
      p.work({ parallel: 2 }).done,
      p.work({ parallel: 2 }).done
    ]);
    const done = results.reduce((all, r) => all.concat(r.done), []).sort();

    expect(done.length).to.equal(4);
    expect(global.__dbmRuns.sort()).to.equal([1, 2, 3, 4]);
    expect(await p.jobs()).to.equal({});
    delete global.__dbmRuns;
  });

  lab.test('failed jobs are rolled back and queued again by up', async () => {
    p = project(
      PETS,
      DATA,
      dml(
        `
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });
  if (!global.__dbmFixed) throw new Error('broken');`,
        ', background: true'
      )
    );
    await p.up();

    const result = await p.work().done;
    expect(result.failed.map(f => f.name)).to.equal(['20261009000003-m3']);
    expect((await p.jobs())['20261009000003-m3']).to.include({ s: 'failed', err: 'broken', step: 0 });
    expect(await p.pets()).to.equal(ORIGINAL);

    // not taken again until queued by up
    expect((await p.work().done).done).to.equal([]);

    global.__dbmFixed = true;
    await p.up();
    expect((await p.work().done).done).to.equal(['20261009000003-m3']);
    delete global.__dbmFixed;
  });

  lab.test('jobs of a worker which stopped responding are taken over', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    // a worker died while running the first step
    const jobs = await p.jobs();
    Object.assign(jobs['20261009000003-m3'], { s: 'running', ID: 'dead', step: 1, learned: 0, done: 0 });
    await p.query(
      `UPDATE migrations_state SET value = '${JSON.stringify({ jobs })}' WHERE key = '${Jobs.JOBS}'`
    );

    const worker = p.work({ watch: true, timeout: 300, interval: 50 });
    try {
      for (let i = 0; i < 200 && (await p.migrations()).length < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      await worker.stop();
    }

    const result = await worker.done;
    expect(result.done).to.equal(['20261009000003-m3']);
    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound', 'cat', 'fish', 'hound', 'hound', 'fish'
    ]);
  });

  lab.test('jobs pause while migrations run', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    const worker = p.work({ pause: 150, batch: 1, watch: true, interval: 20 });
    try {
      // the job is running its batches
      for (let i = 0; i < 100; i++) {
        const [row] = await p.query("SELECT value FROM migrations_state WHERE key = '20261009000003-m3'");
        if (row && (JSON.parse(row.value).s || []).length) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // a migration in between, the progress of the job does not change
      // while it runs
      p.write(3, `
exports.up = async db => {
  const progress = () => db.all("SELECT value FROM migrations_state WHERE key = '20261009000003-m3'");
  const before = await progress();
  await new Promise(resolve => setTimeout(resolve, 300));
  const after = await progress();
  global.__dbmSame = before[0].value === after[0].value;
  global.__dbmJobs = (await db.all("SELECT value FROM migrations_state WHERE key = '${Jobs.JOBS}'"))[0].value;
};
exports.down = async () => {};
`);
      await p.up();
      expect(global.__dbmSame).to.be.true();
      expect(JSON.parse(global.__dbmJobs).pause).to.exist();
      expect((await p.jobs())['20261009000003-m3']).to.exist();

      for (let i = 0; i < 200 && (await p.migrations()).length < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      await worker.stop();
      delete global.__dbmSame;
      delete global.__dbmJobs;
    }

    expect((await worker.done).done).to.equal(['20261009000003-m3']);
    expect(JSON.parse((await p.query(`SELECT value FROM migrations_state WHERE key = '${Jobs.JOBS}'`))[0].value).pause).to.not.exist();
    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound', 'cat', 'fish', 'hound', 'hound', 'fish'
    ]);
  });

  lab.test('a pause whose holder released the lock does not hold', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    // a process paused the jobs and died, another one released the lock since
    const [row] = await p.query(`SELECT value FROM migrations_state WHERE key = '${Jobs.JOBS}'`);
    const state = JSON.parse(row.value);
    state.pause = { ID: 'gone', n: 'x' };
    await p.query(
      `UPDATE migrations_state SET value = '${JSON.stringify(state)}' WHERE key = '${Jobs.JOBS}'`
    );

    const result = await p.work().done;
    expect(result.done).to.equal(['20261009000003-m3']);
  });

  lab.test('down reverts the jobs first, running or not', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    // a job stopped half way
    const worker = p.work({ pause: 30, batch: 1 });
    await new Promise(resolve => setTimeout(resolve, 80));
    await worker.stop();
    expect((await p.jobs())['20261009000003-m3'].step).to.equal(1);
    expect((await p.pets()).map(r => r.kind)).to.not.equal(ORIGINAL.map(r => r.kind));

    await p.down();
    expect(await p.jobs()).to.equal({});
    expect(await p.pets()).to.equal(ORIGINAL);
    expect((await p.migrations()).length).to.equal(2);
    expect(await p.query("SELECT name FROM sqlite_master WHERE name LIKE '__dbm_backup%'")).to.equal([]);

    // a job not started yet, up registers it again
    await p.up();
    await p.down();
    expect(await p.jobs()).to.equal({});
    expect((await p.migrations()).length).to.equal(2);

    await p.down();
    expect(await p.pets()).to.equal([]);
  });

  lab.test('a job recovered by rolling back keeps its record', async () => {
    p = project(
      PETS,
      DATA,
      dml(
        `
  await db.update('pets', { kind: 'hound' }, { kind: 'dog' });
  if (global.__dbmKilled) {
    delete global.__dbmKilled;
    throw Object.assign(new Error('killed'), { stopped: true });
  }
  await db.update('pets', { kind: 'carp' }, { kind: 'fish' });`,
        ", background: true, recovery: 'rollback'"
      )
    );
    await p.up();

    // the job stops after its first step, its next run rolls it back
    global.__dbmKilled = true;
    expect((await p.work().done).done).to.equal(['20261009000003-m3']);
    expect((await p.pets()).map(r => r.kind)).to.equal([
      'hound', 'cat', 'carp', 'hound', 'hound', 'carp'
    ]);

    // the record of the run after the rollback reverts it
    await p.down();
    expect(await p.pets()).to.equal(ORIGINAL);
  });

  lab.test('a job whose migration was recorded already is not run again', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    // its worker died between recording the migration and forgetting the job
    await p.query(
      "INSERT INTO migrations (name, run_on) VALUES ('/20261009000003-m3', CURRENT_TIMESTAMP)"
    );

    expect((await p.work().done).done).to.equal([]);
    expect(await p.jobs()).to.equal({});
    expect(await p.pets()).to.equal(ORIGINAL);
    expect((await p.migrations()).length).to.equal(3);
  });

  lab.test('a job runs in the scope of its migration', async () => {
    p = project(PETS, DATA);
    fs.mkdirSync(path.join(p.dir, 'migrations', 'billing'));
    fs.writeFileSync(
      path.join(p.dir, 'migrations', 'billing', '20261009000010-b1.js'),
      BACKGROUND
    );
    await p.up();
    await p.up(undefined, 'billing');
    expect((await p.jobs())['20261009000010-b1'].sc).to.equal('billing');

    expect((await p.work().done).done).to.equal(['20261009000010-b1']);
    expect(await p.migrations()).to.equal([
      { name: '/20261009000001-m1' },
      { name: '/20261009000002-m2' },
      { name: 'billing/20261009000010-b1' }
    ]);

    await p.down(undefined, 'billing');
    expect(await p.pets()).to.equal(ORIGINAL);

    await expect(p.work({ scope: 'all' }).done).to.reject(Error, /work:<scope>/);
  });

  lab.test('a dry run says which jobs would run', async () => {
    const info = sinon.spy(log, 'info');
    p = project(PETS, DATA, BACKGROUND);
    await p.up();

    try {
      const worker = p.instance({ 'dry-run': true }).executeWork({ interval: 10 });
      expect(await worker.done).to.equal({ done: [], failed: [] });
      expect(info.args.some(a => /20261009000003-m3 would run/.test(a.join(' ')))).to.be.true();
    } finally {
      info.restore();
    }

    expect((await p.jobs())['20261009000003-m3'].s).to.equal('queued');
    expect(await p.pets()).to.equal(ORIGINAL);
  });

  lab.test('fix --backup-state keeps the jobs and the records of dml migrations', async () => {
    p = project(PETS, DATA, BACKGROUND);
    await p.up();
    const kept = async () =>
      (await p.query(
        "SELECT key, value FROM migrations_state WHERE key NOT LIKE '__dbmigrate_s%' AND key NOT LIKE '%-m1' ORDER BY key"
      )).map(r => [r.key, r.key === Jobs.JOBS ? JSON.parse(r.value).jobs : r.value]);
    const before = await kept();

    const cwd = process.cwd();
    process.chdir(p.dir);
    try {
      await p.instance({ 'backup-state': true }).fix();
    } finally {
      process.chdir(cwd);
    }

    expect(await kept()).to.equal(before);
    fs.readdirSync(p.dir).filter(f => f.endsWith('.dbmigrate')).forEach(f =>
      expect(f).to.match(/^migrations_state_b_\d+\.dbmigrate$/)
    );

    expect((await p.work().done).done).to.equal(['20261009000003-m3']);
    await p.down();
    expect(await p.pets()).to.equal(ORIGINAL);
  });

  lab.test('background needs a dml migration', async () => {
    p = project(PETS, PETS.replace('version: 2', 'version: 2, background: true'));
    await expect(p.up()).to.reject(Error, /only dml migrations/);
  });
});
