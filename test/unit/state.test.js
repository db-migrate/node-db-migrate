'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const state = require('../../lib/state.js');
const sinon = require('sinon');

const SSTATE = '__dbmigrate_schema__';
const MSTATE = '__dbmigrate_state__';
const internals = {
  migrationState: 'migrations_state'
};

lab.experiment('state.js', () => {
  lab.experiment('lock', () => {
    const driver = {
      _insertKV: sinon.stub(),
      _updateKV: sinon.stub()
    };

    lab.test('should call insert on non existent state', async () => {
      // Act
      await state.lockState(driver, null, internals);

      // Assert
      Code.expect(
        driver._insertKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      driver._insertKV.reset();
    });

    lab.test('should call update on existent state', async () => {
      // Arrange
      const currentState = {
        value: JSON.stringify({
          s: {
            step: 0,
            fin: 0
          }
        })
      };

      // Act
      await state.lockState(driver, currentState, internals);

      // Assert
      Code.expect(
        driver._updateKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      driver._updateKV.reset();
    });
  });

  lab.experiment('get', () => {
    const driver = {
      _getKV: sinon.stub()
    };

    lab.test('should call _getKV accordingly', async () => {
      // Act
      await state.get(driver, { name: 'test' }, internals);

      // Assert
      Code.expect(
        driver._getKV.withArgs(internals.migrationState, 'test').calledOnce
      ).to.be.true();
      driver._getKV.reset();
    });
  });

  lab.experiment('update', () => {
    const driver = {
      _updateKV: sinon.stub()
    };

    lab.test('should skip _updateKV if in dryRun', async () => {
      // Arrange
      const currentState = {
        value: JSON.stringify({
          s: {
            step: 0,
            fin: 0
          }
        })
      };

      // Act
      await state.update(driver, { name: 'test' }, currentState, {
        ...internals,
        dryRun: true
      });

      // Assert
      Code.expect(driver._updateKV.called).to.be.false();
      driver._updateKV.reset();
    });

    lab.test('should call _updateKV accordingly', async () => {
      // Arrange
      const currentState = {
        value: JSON.stringify({
          s: {
            step: 0,
            fin: 0
          }
        })
      };
      const schema = 'public';

      // Act
      await state.update(driver, { name: 'test' }, currentState, {
        ...internals,
        schema: schema
      });

      // Assert
      Code.expect(
        driver._updateKV.withArgs(internals.migrationState, SSTATE, schema)
          .calledOnce
      ).to.be.true();
      Code.expect(
        driver._updateKV.withArgs(
          internals.migrationState,
          'test',
          JSON.stringify(currentState)
        ).calledOnce
      ).to.be.true();
      driver._updateKV.reset();
    });
  });

  lab.experiment('delete', () => {
    const driver = {
      _deleteKV: sinon.stub()
    };

    lab.test('should call _deleteKV accordingly', async () => {
      // Act
      await state.deleteState(driver, { name: 'test' }, internals);

      // Assert
      Code.expect(
        driver._deleteKV.withArgs(internals.migrationState, 'test').calledOnce
      ).to.be.true();
      driver._deleteKV.reset();
    });
  });

  lab.experiment('init', () => {
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

  lab.experiment('tick', () => {
    const driver = {
      _getKV: sinon.stub(),
      _updateKV: sinon.stub()
    };

    lab.test('should skip tick if in dryRun', async () => {
      // Act
      await state.tick(driver, { ...internals, dryRun: true });

      // Assert
      Code.expect(driver._getKV.called).to.be.false();
      Code.expect(driver._updateKV.called).to.be.false();
      driver._getKV.reset();
      driver._updateKV.reset();
    });

    lab.test('should call tick accordingly', async () => {
      // Arrange
      const oldDate = new Date(2020, 12, 26);
      let currentState = {
        value: JSON.stringify({
          s: {
            step: 0,
            fin: 0,
            date: oldDate
          }
        })
      };
      driver._getKV.resolves(currentState);

      // Act
      await state.tick(driver, internals);

      // Assert
      currentState = JSON.parse(driver._updateKV.args[0][2]);
      Code.expect(
        driver._getKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      Code.expect(
        driver._updateKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      Code.expect(currentState.s.step).to.be.equal(0);
      Code.expect(currentState.s.fin).to.be.equal(0);
      Code.expect(new Date(currentState.s.date)).to.be.greaterThan(oldDate);
      driver._getKV.reset();
      driver._updateKV.reset();
    });
  });

  lab.experiment('step', () => {
    const driver = {
      _getKV: sinon.stub(),
      _updateKV: sinon.stub()
    };

    lab.test('should skip step if in dryRun', async () => {
      // Act
      await state.step(driver, 3, { ...internals, dryRun: true });

      // Assert
      Code.expect(driver._getKV.called).to.be.false();
      Code.expect(driver._updateKV.called).to.be.false();
      driver._getKV.reset();
      driver._updateKV.reset();
    });

    lab.test('should call tick accordingly', async () => {
      // Arrange
      const oldDate = new Date(2020, 12, 26);
      const currentStep = 3;
      let currentState = {
        value: JSON.stringify({
          s: {
            step: 0,
            fin: 0,
            date: oldDate
          }
        })
      };
      driver._getKV.resolves(currentState);

      // Act
      await state.step(driver, currentStep, internals);

      // Assert
      currentState = JSON.parse(driver._updateKV.args[0][2]);
      Code.expect(
        driver._getKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      Code.expect(
        driver._updateKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      Code.expect(currentState.s.step).to.be.equal(currentStep);
      Code.expect(currentState.s.fin).to.be.equal(0);
      Code.expect(new Date(currentState.s.date)).to.be.greaterThan(oldDate);
      driver._getKV.reset();
      driver._updateKV.reset();
    });
  });

  lab.experiment('startMigration', () => {
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

    lab.test('should exit early on dryRun and parse available schema', async () => {
      driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
      driver._getKV
        .withArgs(internals.migrationState, 'test')
        .resolves({ value: '{"x": "y"}' });
      const newInt = { ...internals, dryRun: true };

      await state.startMigration(driver, { name: 'test' }, newInt);
      Code.expect(driver._getKV.called).to.be.true();
      Code.expect(newInt.modSchema).to.equal({ x: 'y' });
      Code.expect(lockStub.called).to.be.false();
    });

    lab.test('should call lockState and insert file state if unset', async () => {
      driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
      driver._getKV.withArgs(internals.migrationState, 'test').resolves(null);
      const newInt = { ...internals };

      await state.startMigration(driver, { name: 'test' }, newInt);
      Code.expect(driver._getKV.called).to.be.true();
      Code.expect(driver._insertKV.called).to.be.true();
      Code.expect(lockStub.called).to.be.true();
    });

    lab.test('should call lockState and and skip inserting file state if already set', async () => {
      driver._getKV.withArgs(internals.migrationState, SSTATE).resolves(null);
      driver._getKV
        .withArgs(internals.migrationState, 'test')
        .resolves({ value: '{"x": "y"}' });
      const newInt = { ...internals };

      await state.startMigration(driver, { name: 'test' }, newInt);
      Code.expect(driver._getKV.called).to.be.true();
      Code.expect(driver._insertKV.called).to.be.false();
      Code.expect(lockStub.called).to.be.true();
    });
  });

  lab.experiment('endMigration', () => {
    const driver = {
      _getKV: sinon.stub(),
      _updateKV: sinon.stub()
    };

    lab.test('should skip endMigration if in dryRun', async () => {
      // Act
      await state.endMigration(driver, { name: 'test' }, { ...internals, dryRun: true });

      // Assert
      Code.expect(driver._getKV.called).to.be.false();
      Code.expect(driver._updateKV.called).to.be.false();
      driver._getKV.reset();
      driver._updateKV.reset();
    });

    lab.test('should call endMigration and update state', async () => {
      // Arrange
      const oldDate = new Date(2020, 12, 26);
      let currentState = {
        value: JSON.stringify({
          s: {
            step: 0,
            fin: 0,
            date: oldDate
          }
        })
      };
      driver._getKV.resolves(currentState);

      // Act
      await state.endMigration(driver, { name: 'test' }, internals);

      // Assert
      currentState = JSON.parse(driver._updateKV.args[0][2]);
      Code.expect(
        driver._getKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      Code.expect(
        driver._updateKV.withArgs(internals.migrationState, MSTATE).calledOnce
      ).to.be.true();
      Code.expect(currentState.s.step).to.be.equal(0);
      Code.expect(currentState.s.fin).to.be.equal(1);
      Code.expect(new Date(currentState.s.date)).to.be.greaterThan(oldDate);
      driver._getKV.reset();
      driver._updateKV.reset();
    });
  });
});
