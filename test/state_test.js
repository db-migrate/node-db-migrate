'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const state = require('../lib/state.js');
const sinon = require('sinon');

const SSTATE = '__dbmigrate_schema__';
const MSTATE = '__dbmigrate_state__';
const internals = {
  migrationState: 'migrations_state'
};

lab.experiment('state', function () {
  lab.experiment('lock', function () {
    const MSTATE_KEY = MSTATE;
    const opts = { argv: { 'lock-timeout': 60, 'lock-interval': 5 } };
    const lockInternals = { ...internals, ...opts };

    // every instance has its own ID, like a separate process
    const instance = () => {
      delete require.cache[require.resolve('../lib/state.js')];
      return require('../lib/state.js');
    };

    // in memory KV store with the semantics of the real drivers,
    // run_on is a counter standing in for the database clock
    const memoryDriver = () => {
      const rows = new Map();
      let clock = 0;
      const tick = () => new Promise(resolve => setImmediate(resolve));
      const driver = {
        rows,
        _getKV: async (table, key) => {
          await tick();
          const row = rows.get(key);
          return row && { ...row };
        },
        _insertKV: async (table, key, value) => {
          await tick();
          if (rows.has(key)) throw new Error('duplicate key');
          rows.set(key, { key, value, run_on: ++clock });
        },
        _updateKV: async (table, key, value) => {
          await tick();
          rows.set(key, { key, value, run_on: ++clock });
        },
        _updateKVC: async (table, key, value, c, v) => {
          await tick();
          const row = rows.get(key);
          if (row && row[c] === v) rows.set(key, { key, value, run_on: ++clock });
        }
      };

      return driver;
    };

    const lockHolder = driver => JSON.parse(driver.rows.get(MSTATE_KEY).value).s.ID;

    lab.test('should acquire a free lock by inserting the state', async () => {
      const a = instance();
      const driver = memoryDriver();

      Code.expect(await a.acquire(driver, lockInternals)).to.be.true();
      Code.expect(a.isOwner()).to.be.true();
      Code.expect(lockHolder(driver)).to.not.equal(0);

      await a.release(driver, lockInternals);
      Code.expect(a.isOwner()).to.be.false();
      Code.expect(lockHolder(driver)).to.equal(0);
    });

    lab.test('should not acquire a lock held by another process', async () => {
      const a = instance();
      const b = instance();
      const driver = memoryDriver();

      Code.expect(await a.acquire(driver, lockInternals)).to.be.true();
      Code.expect(await b.acquire(driver, lockInternals)).to.be.false();

      await a.release(driver, lockInternals);
      Code.expect(await b.acquire(driver, lockInternals)).to.be.true();
      await b.release(driver, lockInternals);
    });

    lab.test('should have exactly one winner on concurrent insert', async () => {
      const instances = [instance(), instance(), instance(), instance()];
      const driver = memoryDriver();

      const won = await Promise.all(
        instances.map(i => i.acquire(driver, lockInternals))
      );
      Code.expect(won.filter(Boolean).length).to.equal(1);

      await Promise.all(instances.map(i => i.release(driver, lockInternals)));
    });

    lab.test('should have exactly one winner on concurrent update', async () => {
      const instances = [instance(), instance(), instance(), instance()];
      const driver = memoryDriver();
      await driver._insertKV(
        internals.migrationState,
        MSTATE_KEY,
        JSON.stringify({ s: { step: 0, fin: 1, ID: 0 } })
      );

      const won = await Promise.all(
        instances.map(i => i.acquire(driver, lockInternals))
      );
      Code.expect(won.filter(Boolean).length).to.equal(1);

      await Promise.all(instances.map(i => i.release(driver, lockInternals)));
    });

    lab.test('should throw instead of looping if compare and swap never applies', async () => {
      const a = instance();
      const driver = memoryDriver();
      driver._updateKVC = async () => {};
      await driver._insertKV(
        internals.migrationState,
        MSTATE_KEY,
        JSON.stringify({ s: { step: 0, fin: 1, ID: 0 } })
      );

      await Code.expect(a.acquire(driver, lockInternals)).to.reject(
        /compare and swap/
      );
    });

    lab.test('should return from waiting once the lock is released', async () => {
      const a = instance();
      const b = instance();
      const driver = memoryDriver();

      await a.acquire(driver, lockInternals);
      const waiting = b.waitForRelease(driver, lockInternals);
      await a.release(driver, lockInternals);

      Code.expect(await waiting).to.be.null();
      Code.expect(await b.acquire(driver, lockInternals)).to.be.true();
      await b.release(driver, lockInternals);
    });

    lab.test('should keep the lock alive with a heartbeat', async () => {
      const a = instance();
      const b = instance();
      const driver = memoryDriver();

      await a.acquire(driver, lockInternals);
      const waiting = b.waitForRelease(driver, lockInternals);
      let settled = false;
      waiting.then(() => {
        settled = true;
      });

      // several lock timeouts pass, the holder is alive though
      await new Promise(resolve => setTimeout(resolve, 250));
      Code.expect(settled).to.be.false();

      await a.release(driver, lockInternals);
      Code.expect(await waiting).to.be.null();
    });

    lab.test('should take over a stale lock and the old owner notices', async () => {
      const a = instance();
      const b = instance();
      const driver = memoryDriver();

      await a.acquire(driver, lockInternals);
      await a.startMigration(driver, { name: 'm1' }, lockInternals);
      // simulate a dead process, no more heartbeats
      a.__stopHeartbeat();

      Code.expect(await b.acquire(driver, lockInternals)).to.be.false();
      const stale = await b.waitForRelease(driver, lockInternals);
      Code.expect(stale).to.not.be.null();
      Code.expect(JSON.parse(stale.value).s.fin).to.equal(0);

      Code.expect(await b.acquire(driver, lockInternals, stale)).to.be.true();

      await Code.expect(a.step(driver, 1, lockInternals)).to.reject(
        /lost the migration lock/
      );
      Code.expect(a.isOwner()).to.be.false();

      await a.release(driver, lockInternals);
      Code.expect(b.isOwner()).to.be.true();
      await b.release(driver, lockInternals);
    });

    lab.test('should not take over with an outdated stale row', async () => {
      const a = instance();
      const b = instance();
      const driver = memoryDriver();

      await a.acquire(driver, lockInternals);
      const old = await driver._getKV(internals.migrationState, MSTATE_KEY);
      await a.step(driver, 1, lockInternals);

      Code.expect(await b.acquire(driver, lockInternals, old)).to.be.false();
      await a.release(driver, lockInternals);
    });

    lab.test('should track migration progress in the lock', async () => {
      const a = instance();
      const driver = memoryDriver();

      await a.acquire(driver, lockInternals);
      await a.startMigration(driver, { name: 'm1' }, lockInternals);
      await a.step(driver, 3, lockInternals);
      let s = JSON.parse(driver.rows.get(MSTATE_KEY).value).s;
      Code.expect(s.fin).to.equal(0);
      Code.expect(s.step).to.equal(3);

      await a.endMigration(driver, { name: 'm1' }, lockInternals);
      s = JSON.parse(driver.rows.get(MSTATE_KEY).value).s;
      Code.expect(s.fin).to.equal(1);
      // the lock stays until released
      Code.expect(a.isOwner()).to.be.true();

      await a.release(driver, lockInternals);
    });
  });

  lab.experiment('get', function () {
    const driver = {
      _getKV: sinon.stub()
    };

    lab.test('should call _getKV accordingly', async () => {
      await state.get(driver, { name: 'test' }, internals);
      Code.expect(
        driver._getKV.withArgs(internals.migrationState, 'test').called
      ).to.be.true();
      driver._getKV.reset();
    });
  });

  lab.experiment('delete', function () {
    const driver = {
      _deleteKV: sinon.stub()
    };

    lab.test('should call _deleteKV accordingly', async () => {
      await state.deleteState(driver, { name: 'test' }, internals);
      Code.expect(
        driver._deleteKV.withArgs(internals.migrationState, 'test').called
      ).to.be.true();
      driver._deleteKV.reset();
    });
  });

  lab.experiment('init', function () {
    const driver = {
      _insertKV: sinon.stub(),
      _updateKV: sinon.stub(),
      _createKV: sinon.stub(),
      _getKV: sinon.stub()
    };

    lab.afterEach(() => {
      driver._getKV.reset();
      driver._insertKV.reset();
      driver._createKV.reset();
    });

    lab.test('should initialize schema if it does not exist', async () => {
      driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);

      await state.init(driver, internals, {});
      Code.expect(driver._getKV.called).to.be.true();
      Code.expect(
        driver._insertKV.withArgs(internals.migrationState, SSTATE, '{}').called
      ).to.be.true();
      Code.expect(
        driver._getKV.withArgs(internals.migrationState, MSTATE).called
      ).to.be.false();
    });

    lab.test('should reuse schema if it does exist', async () => {
      driver._getKV
        .withArgs(internals.migrationState, SSTATE)
        .resolves({ value: '{"c":{"t":{}}}' });
      const newInt = { ...internals };

      await state.init(driver, newInt, {});
      Code.expect(driver._insertKV.called).to.be.false();
      Code.expect(newInt.schema).to.equal({ i: {}, c: { t: {} }, f: {}, e: {} });
    });

    lab.test('should accept a schema inserted concurrently', async () => {
      driver._getKV
        .withArgs(internals.migrationState, SSTATE)
        .onFirstCall()
        .resolves(null)
        .onSecondCall()
        .resolves({ value: '{}' });
      driver._insertKV.rejects(new Error('duplicate key'));
      const newInt = { ...internals };

      await state.init(driver, newInt, {});
      Code.expect(newInt.schema).to.equal({ i: {}, c: {}, f: {}, e: {} });
      driver._insertKV.reset();
    });

    lab.test('should retry creating the state table once', async () => {
      driver._createKV.onFirstCall().rejects(new Error('pg_type collision'));
      driver._getKV.withArgs(internals.migrationState, SSTATE).resolves({ value: '{}' });

      await state.init(driver, { ...internals }, {});
      Code.expect(driver._createKV.calledTwice).to.be.true();
    });
  });

  lab.experiment('startMigration', function () {
    const driver = {
      _insertKV: sinon.stub(),
      _updateKV: sinon.stub(),
      _createKV: sinon.stub(),
      _getKV: sinon.stub()
    };

    lab.afterEach(() => {
      driver._getKV.reset();
      driver._insertKV.reset();
      driver._updateKV.reset();
    });

    lab.test(
      'should exit early on dryRun and parse available schema',
      async () => {
        driver._getKV
          .withArgs(internals.migrationState, 'test')
          .resolves({ value: '{"x": "y"}' });
        const newInt = { ...internals, dryRun: true };

        await state.startMigration(driver, { name: 'test' }, newInt);
        Code.expect(driver._getKV.called).to.be.true();
        Code.expect(newInt.modSchema).to.equal({ x: 'y' });
        Code.expect(driver._insertKV.called).to.be.false();
        Code.expect(driver._updateKV.called).to.be.false();
      }
    );

    lab.test(
      'should write the state without a lock and insert file state if unset',
      async () => {
        driver._getKV.withArgs(internals.migrationState, MSTATE).resolves(null);
        driver._getKV.withArgs(internals.migrationState, 'test').resolves(null);

        await state.startMigration(driver, { name: 'test' }, { ...internals });
        Code.expect(
          driver._insertKV.withArgs(internals.migrationState, MSTATE).called
        ).to.be.true();
        Code.expect(
          driver._insertKV.withArgs(internals.migrationState, 'test', '{}').called
        ).to.be.true();
      }
    );

    lab.test(
      'should skip inserting file state if already set',
      async () => {
        driver._getKV
          .withArgs(internals.migrationState, MSTATE)
          .resolves({ value: JSON.stringify({ s: { step: 2, fin: 1, ID: 0 } }) });
        driver._getKV
          .withArgs(internals.migrationState, 'test')
          .resolves({ value: '{"x": "y"}' });

        await state.startMigration(driver, { name: 'test' }, { ...internals });
        Code.expect(driver._insertKV.called).to.be.false();
        const written = JSON.parse(driver._updateKV.firstCall.args[2]).s;
        Code.expect(written.fin).to.equal(0);
        Code.expect(written.step).to.equal(0);
      }
    );
  });
});
