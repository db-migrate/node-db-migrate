'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const sinon = require('sinon');
const path = require('path');
const check = require('../../lib/commands/check');
const config = require('../../lib/config');
const testHelper = require('./testHelper.js');

lab.experiment('check.js', () => {
  lab.experiment('check migration', () => {
    let _internals;
    let _config;
    const configPath = path.join(__dirname, 'database.json');
    const env = 'test';
    const migrationsFolder = testHelper.migrationsFolder;
    const migrationName = 'migration-Name';
    const plugins = testHelper.createSinglePlugin(`file:hook:require`, () => {
      return 'test all variables';
    });
    const onCompleteStub = sinon.stub();

    lab.beforeEach(() => {
      _internals = {
        argv: {
          _: [migrationName],
          'migrations-dir': migrationsFolder
        },
        onComplete: onCompleteStub,
        plugins: plugins
      };
      _config = config.load(configPath, env);
    });

    lab.afterEach(async () => {
      onCompleteStub.reset();
      await testHelper.wipeMigrations();
    });

    lab.experiment('have migration files', () => {
      let checkStub;
      const checkResult = [
        {
          path: path.join(migrationsFolder, '20210506040432-test.js'),
          name: '20210506040432-test',
          title: 'test'
        }
      ];

      lab.before(() => {
        checkStub = sinon.stub(
          require('../../lib/walker.js').prototype,
          'check'
        );
      });

      lab.afterEach(() => {
        checkStub.reset();
      });

      lab.after(() => {
        checkStub.restore();
      });

      lab.test('on complete should success', async () => {
        // Arrange
        checkStub.returns(checkResult);

        // Act
        const fn = check.bind(null, _internals, _config);

        // Assert
        await Code.expect(fn()).to.not.reject();
        Code.expect(onCompleteStub.calledOnce).to.be.true();
        Code.expect(onCompleteStub.args[0]).to.have.length(4);
        Code.expect(onCompleteStub.args[0][1]).to.be.equal(_internals);
        Code.expect(onCompleteStub.args[0][2]).to.be.null();
        Code.expect(onCompleteStub.args[0][3]).to.be.equal(checkResult);
        Code.expect(checkStub.calledOnce).to.be.true();
        Code.expect(_internals.migrationsDir).to.equal(migrationsFolder);
      });

      lab.test('has locTitle should change migrationDir', async () => {
        // Arrange
        _internals.locTitle = 'locTitle';
        checkStub.returns(checkResult);

        // Act
        const fn = check.bind(null, _internals, _config);

        // Assert
        await Code.expect(fn()).to.not.reject();
        Code.expect(onCompleteStub.calledOnce).to.be.true();
        Code.expect(onCompleteStub.args[0]).to.have.length(4);
        Code.expect(onCompleteStub.args[0][1]).to.be.equal(_internals);
        Code.expect(onCompleteStub.args[0][2]).to.be.null();
        Code.expect(onCompleteStub.args[0][3]).to.be.equal(checkResult);
        Code.expect(checkStub.calledOnce).to.be.true();
        Code.expect(_internals.migrationsDir).to.equal(
          path.join(migrationsFolder, _internals.locTitle)
        );
      });
    });

    lab.experiment('does not have migration files', () => {
      lab.test('should handle and swallow error', async () => {
        // Arrange
        _internals.locTitle = 'locTitle';

        // Act
        const fn = check.bind(null, _internals, _config);

        // Assert
        await Code.expect(fn()).to.not.reject();
        Code.expect(onCompleteStub.calledOnce).to.be.true();
        Code.expect(onCompleteStub.args[0]).to.have.length(3);
        Code.expect(onCompleteStub.args[0][1]).to.be.equal(_internals);
        Code.expect(onCompleteStub.args[0][2]).to.be.instanceOf(Error);
        Code.expect(_internals.migrationsDir).to.equal(
          path.join(migrationsFolder, _internals.locTitle)
        );
      });
    });
  });
});
