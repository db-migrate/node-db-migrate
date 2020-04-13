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
    const driver = {
      _insertKV: sinon.stub(),
      _updateKV: sinon.stub()
    };

    lab.test('should call insert on non existent state', async () => {
      await state.lockState(driver, null, internals);
      Code.expect(driver._insertKV.called).to.be.true();
      driver._insertKV.reset();
    });

    lab.test('should call update on existent state', async () => {
      await state.lockState(
        driver,
        {
          value: JSON.stringify({
            s: {
              step: 0,
              fin: 0
            }
          })
        },
        internals
      );
      Code.expect(driver._updateKV.called).to.be.true();
      driver._updateKV.reset();
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

    let lockStub;

    lab.before(() => {
      lockStub = sinon.stub(state, 'lockState');
    });

    lab.afterEach(() => {
      driver._getKV.reset();
      driver._insertKV.reset();
      lockStub.reset();
    });

    lab.after(() => {
      lockStub.restore();
    });

    lab.test('should initialize schema if it does not exist', async () => {
      driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
      driver._getKV.withArgs(internals.migrationState, MSTATE).resolves(null);

      await state.init(driver, internals);
      Code.expect(driver._getKV.called).to.be.true();
      Code.expect(
        driver._insertKV.withArgs(internals.migrationState, SSTATE, '{}').called
      ).to.be.true();
      Code.expect(lockStub.called).to.be.true();
    });

    lab.test('should reuse schema if it does exist', async () => {
      driver._getKV
        .withArgs(internals.migrationState, SSTATE)
        .resolves({ value: '{}' });
      driver._getKV.withArgs(internals.migrationState, MSTATE).resolves(null);

      await state.init(driver, internals);
      Code.expect(driver._getKV.called).to.be.true();
      Code.expect(lockStub.called).to.be.true();
    });

    lab.test('should skip lockState if in dryRun', async () => {
      driver._getKV
        .withArgs(internals.migrationState, SSTATE)
        .resolves({ value: '{}' });
      driver._getKV.withArgs(internals.migrationState, MSTATE).resolves(null);

      await state.init(driver, { ...internals, dryRun: true });
      Code.expect(lockStub.called).to.be.false();
    });
  });

  lab.experiment('startMigration', function () {
    const driver = {
      _insertKV: sinon.stub(),
      _updateKV: sinon.stub(),
      _createKV: sinon.stub(),
      _getKV: sinon.stub()
    };

    let lockStub;

    lab.before(() => {
      lockStub = sinon.stub(state, 'lockState');
    });

    lab.afterEach(() => {
      driver._getKV.reset();
      driver._insertKV.reset();
      lockStub.reset();
    });

    lab.after(() => {
      lockStub.restore();
    });

    lab.test(
      'should exit early on dryRun and parse available schema',
      async () => {
        driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
        driver._getKV
          .withArgs(internals.migrationState, 'test')
          .resolves({ value: '{"x": "y"}' });
        const newInt = { ...internals, dryRun: true };

        await state.startMigration(driver, { name: 'test' }, newInt);
        Code.expect(driver._getKV.called).to.be.true();
        Code.expect(newInt.modSchema).to.equal({ x: 'y' });
        Code.expect(lockStub.called).to.be.false();
      }
    );

    lab.test(
      'should call lockState and insert file state if unset',
      async () => {
        driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
        driver._getKV.withArgs(internals.migrationState, 'test').resolves(null);
        const newInt = { ...internals };

        await state.startMigration(driver, { name: 'test' }, newInt);
        Code.expect(driver._getKV.called).to.be.true();
        Code.expect(driver._insertKV.called).to.be.true();
        Code.expect(lockStub.called).to.be.true();
      }
    );

    lab.test(
      'should call lockState and and skip inserting file state if already set',
      async () => {
        driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
        driver._getKV
          .withArgs(internals.migrationState, 'test')
          .resolves({ value: '{"x": "y"}' });
        const newInt = { ...internals };

        await state.startMigration(driver, { name: 'test' }, newInt);
        Code.expect(driver._getKV.called).to.be.true();
        Code.expect(driver._insertKV.called).to.be.false();
        Code.expect(lockStub.called).to.be.true();
      }
    );
  });
});
