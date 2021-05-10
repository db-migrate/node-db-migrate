'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const sinon = require('sinon');
const path = require('path');
const executeDb = require('../../lib/commands/db');
const config = require('../../lib/config');

lab.experiment('db.js', () => {
  let _internals;
  let _config;
  const env = 'test';
  const dbname = 'db_name';
  const configPath = path.join(__dirname, 'database.json');

  lab.beforeEach(() => {
    _internals = {};
    _config = config.load(configPath, env);
  });

  lab.experiment('create database', () => {
    const callbackStub = sinon.stub();

    lab.beforeEach(() => {
      _internals.mode = 'create';
      _internals.argv = {
        _: [dbname]
      };
    });

    lab.afterEach(() => {
      callbackStub.reset();
    });

    lab.test('without database name should return error', () => {
      _internals.argv._ = [];
      const fn = executeDb.bind(null, _internals, _config, callbackStub);

      Code.expect(fn).to.throw(Error, 'You must enter a database name!');
      Code.expect(_internals.argv.dbname).to.not.exist();
      Code.expect(callbackStub.called).to.be.false();
    });

    lab.test('without driver should return error', () => {
      _config[env].driver = '';
      const fn = executeDb.bind(null, _internals, _config, callbackStub);

      Code.expect(fn).to.throw(
        Error,
        'config must include a driver key specifing which driver to use'
      );
      Code.expect(callbackStub.called).to.be.false();
    });

    lab.test('with database name', () => {
      const fn = executeDb.bind(null, _internals, _config, callbackStub);

      Code.expect(fn).to.not.throw();
      Code.expect(_internals.argv.dbname).to.be.equal(dbname);
      Code.expect(callbackStub.called).to.be.false();
    });
  });

  lab.experiment('drop database', () => {
    let callbackStub;
    let sqliteStub;

    lab.before(() => {
      callbackStub = sinon.stub();
      sqliteStub = sinon.stub(require('db-migrate-sqlite3'), 'connect');
    });

    lab.beforeEach(() => {
      _internals.mode = 'drop';
      _internals.argv = {
        _: [dbname]
      };
    });

    lab.afterEach(() => {
      callbackStub.reset();
      sqliteStub.reset();
    });

    lab.test('without database name should return error', () => {
      // Arrange
      _internals.argv._ = [];

      // Act
      const fn = executeDb.bind(null, _internals, _config, callbackStub);

      // Assert
      Code.expect(fn).to.throw(
        Error,
        'You must enter a database name!'
      );
      Code.expect(_internals.argv.dbname).to.not.exist();
      Code.expect(callbackStub.called).to.be.false();
      Code.expect(sqliteStub.called).to.be.false();
    });

    lab.test('without driver should return error', () => {
      // Arrange
      _config[env].driver = '';

      // Act
      const fn = executeDb.bind(null, _internals, _config, callbackStub);

      // Assert
      Code.expect(fn).to.throw(
        Error,
        'config must include a driver key specifing which driver to use'
      );
      Code.expect(callbackStub.called).to.be.false();
      Code.expect(sqliteStub.called).to.be.false();
    });

    lab.experiment('with database name', () => {
      let driverStub = {
        dropDatabase: sinon.stub().callsFake(function () {
          Code.expect(arguments[0]).to.be.equal(dbname);
          Code.expect(arguments[1].ifExists).to.be.true(dbname);
          Code.expect(arguments[2]).to.be.instanceOf(Function);

          // invoke callback
          arguments[2]();
        }),
        close: sinon.stub()
      };

      lab.afterEach(() => {
        driverStub.dropDatabase.reset();
        driverStub.close.reset();
      });

      lab.test('should be successful', () => {
        // Arrange
        sqliteStub.callsFake((config, intern, callback) => {
          callback(null, driverStub);
        });

        // Act
        const fn = executeDb.bind(null, _internals, _config, callbackStub);

        // Assert
        Code.expect(fn).to.not.throw();
        Code.expect(_internals.argv._).to.be.empty();
        Code.expect(_internals.argv.dbname).to.be.equal(dbname);
        // Code.expect(callbackStub.calledOnce).to.be.true();
        Code.expect(sqliteStub.calledOnce).to.be.true();
        Code.expect(driverStub.dropDatabase.calledOnce).to.be.true();
        Code.expect(driverStub.close.calledOnce).to.be.true();
      });

      lab.test('but connect with error', () => {
        // Arrange
        sqliteStub.callsFake((config, intern, callback) => {
          callback(new Error('error'), driverStub);
        });

        // Act
        const fn = executeDb.bind(null, _internals, _config, callbackStub);

        // Assert
        Code.expect(fn).to.throw();
        Code.expect(callbackStub.called).to.be.false();
        Code.expect(sqliteStub.calledOnce).to.be.true();
        Code.expect(driverStub.dropDatabase.called).to.be.false();
        Code.expect(driverStub.close.called).to.be.false();
      });

      lab.test('has error', () => {
        // Arrange
        driverStub = {
          dropDatabase: sinon.stub().callsFake(function () {
            Code.expect(arguments[0]).to.be.equal(dbname);
            Code.expect(arguments[1].ifExists).to.be.true(dbname);
            Code.expect(arguments[2]).to.be.instanceOf(Function);

            // invoke callback
            arguments[2](new Error('error'));
          }),
          close: sinon.stub()
        };
        sqliteStub.callsFake((config, intern, callback) => {
          callback(null, driverStub);
        });

        // Act
        const fn = executeDb.bind(null, _internals, _config, callbackStub);

        // Assert
        Code.expect(fn).to.not.throw();
        Code.expect(callbackStub.calledOnce).to.be.true();
        Code.expect(sqliteStub.calledOnce).to.be.true();
        Code.expect(driverStub.dropDatabase.calledOnce).to.be.true();
        Code.expect(driverStub.close.calledOnce).to.be.true();
      });
    });
  });
});
