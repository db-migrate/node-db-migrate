'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const sinon = require('sinon');
const path = require('path');
const config = require('../../lib/config');
const loadConfig = require('../../lib/commands/helper/load-config');
const log = require('db-migrate-shared').log;
const testHelper = require('./testHelper.js');

lab.experiment('load-config.js', () => {
  lab.experiment('load configuration', () => {
    let _internals;
    let logStub;
    const env = 'test';

    lab.before(() => {
      logStub = sinon.stub(log);
    });

    lab.after(() => {
      sinon.restore();
    });

    lab.experiment('from file', () => {
      const configPath = path.join(__dirname, 'database.json');
      const plugins = testHelper.createSinglePlugin(`file:hook:require`, () => {
        return 'test all variables';
      });

      lab.beforeEach(() => {
        _internals = {
          argv: {
            env: env,
            config: configPath
          },
          plugins: plugins
        };
      });

      lab.test('should load successfully', () => {
        // Act
        const cfg = loadConfig(config, _internals);

        // Assert
        const current = cfg.getCurrent();
        Code.expect(cfg).to.exists();
        Code.expect(current).to.exists();
        Code.expect(current.env).to.equal(env);
        Code.expect(current.settings.driver).to.equal('sqlite3');
        Code.expect(current.settings.filename).to.equal(':memory:');
      });

      lab.test('with verbose on should load with verbose info', () => {
        // Arrange
        _internals.verbose = true;

        // Act
        const cfg = loadConfig(config, _internals);

        // Assert
        const current = cfg.getCurrent();
        Code.expect(cfg).to.exists();
        Code.expect(current).to.exists();
        Code.expect(logStub.info.calledOnce).to.be.true();
        logStub.info.reset();
      });
    });

    lab.experiment('from config object', () => {
      lab.beforeEach(() => {
        _internals = {
          currentEnv: env,
          configObject: {
            test: {
              url: 'postgres://uname:pw@server.com/dbname'
            }
          }
        };
      });

      lab.test('should load successfully', () => {
        // Act
        const cfg = loadConfig(config, _internals);

        // Assert
        const current = cfg.getCurrent();
        Code.expect(cfg).to.exists();
        Code.expect(current).to.exists();
        Code.expect(current.env).to.equal(env);
        Code.expect(current.settings.url).to.not.exists();
        Code.expect(current.settings.driver).to.equal('postgres');
        Code.expect(current.settings.user).to.equal('uname');
        Code.expect(current.settings.password).to.equal('pw');
        Code.expect(current.settings.host).to.equal('server.com');
        Code.expect(current.settings.database).to.equal('dbname');
      });

      lab.test('with verbose on should load with verbose info', () => {
        // Arrange
        _internals.verbose = true;

        // Act
        const cfg = loadConfig(config, _internals);

        // Assert
        const current = cfg.getCurrent();
        Code.expect(cfg).to.exists();
        Code.expect(current).to.exists();
        Code.expect(logStub.info.calledOnce).to.be.true();
        logStub.info.reset();
      });
    });
  });
});
