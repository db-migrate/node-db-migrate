'use-strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const sinon = require('sinon');
const Migrator = require('../../lib/walker');
const log = require('db-migrate-shared').log;
const testHelper = require('./testHelper.js');

lab.experiment('walker.js', () => {
  let driverStub;
  let migrator;
  const prefix = 'migration';
  const migrationFolder = testHelper.migrationsFolder;
  const _internals = {
    migrationState: 'migrations_state',
    matching: 'matching'
  };

  lab.beforeEach(() => {
    driverStub = {
      _insertKV: sinon.stub(),
      _updateKV: sinon.stub(),
      _createKV: sinon.stub(),
      _getKV: sinon.stub(),
      _createList: sinon.stub(),
      createMigrationsTableAsync: sinon.stub().resolves(),
      addMigrationRecord: sinon.stub(),
      deleteMigration: sinon.stub()
    };
    migrator = new Migrator(
      driverStub,
      migrationFolder,
      _internals.mode !== 'static',
      _internals,
      prefix
    );
  });

  lab.test('migrator should init successfully', async () => {
    // Assert
    Code.expect(migrator).to.exists();
    Code.expect(migrator.directory).to.be.equal(migrationFolder);
    Code.expect(migrator.internals.migrationState).to.be.equal(_internals.migrationState);
    Code.expect(migrator.prefix).to.be.equal(prefix);
  });

  lab.experiment('check migrations', () => {
    let loadFromFileystemStub;
    let loadFromDatabaseStub;

    lab.afterEach(() => {
      loadFromFileystemStub.reset();
      loadFromDatabaseStub.reset();
    });

    lab.test('should return the migrations to be run', () => {
      // Arrange
      const completedMigration = {
        name: '20180330020329-thisMigrationIsCompleted'
      };
      const uncompletedMigration = {
        name: '20180330020330-thisMigrationIsNotCompleted'
      };
      loadFromFileystemStub = sinon
        .stub(require('../../lib/file'), 'loadFromFileystem')
        .resolves([uncompletedMigration]);
      loadFromDatabaseStub = sinon
        .stub(require('../../lib/file'), 'loadFromDatabase')
        .resolves([completedMigration]);

      // Act & Assert
      migrator.check(null, function (err, res) {
        Code.expect(loadFromFileystemStub.calledOnce).to.be.true();
        Code.expect(loadFromDatabaseStub.calledOnce).to.be.true();
        Code.expect(err).to.be.null();
        Code.expect(res.length).to.equal(1);
        Code.expect(res[0].name).to.equal(uncompletedMigration.name);
      });
    });
  });

  lab.experiment('create tables', () => {
    lab.test('should create tables successfully', async () => {
      // Act
      await migrator.createTables();

      // Assert
      Code.expect(driverStub._createList.calledOnce).to.be.true();
    });
  });

  lab.experiment('create migrations', () => {
    let logStub;

    lab.before(() => {
      logStub = sinon.stub(log);
    });

    lab.after(() => {
      sinon.restore();
    });

    lab.test('if _createList is not a function', async () => {
      // Arrange
      driverStub._createList = {};

      // Act
      await migrator.createMigrationsTable();

      // Assert
      Code.expect(logStub.warn.calledOnce).to.be.true();
      Code.expect(
        driverStub.createMigrationsTableAsync.calledOnce
      ).to.be.true();
      logStub.warn.reset();
    });

    lab.test('if _getList is not a function', async () => {
      // Arrange
      driverStub._getList = {};

      // Act
      await migrator.createMigrationsTable();

      // Assert
      Code.expect(logStub.warn.calledOnce).to.be.true();
      Code.expect(driverStub._createList.calledOnce).to.be.true();
      logStub.warn.reset();
    });

    lab.test('if _deleteKV is not a function', async () => {
      // Arrange
      driverStub._deleteKV = {};

      // Act
      await migrator.createMigrationsTable();

      // Assert
      Code.expect(logStub.warn.calledOnce).to.be.true();
      Code.expect(driverStub._createList.calledOnce).to.be.true();
      logStub.warn.reset();
    });

    lab.test('if _deleteEntry is not a function', async () => {
      // Arrange
      driverStub._deleteEntry = {};

      // Act
      await migrator.createMigrationsTable();

      // Assert
      Code.expect(logStub.warn.calledOnce).to.be.true();
      Code.expect(driverStub._createList.calledOnce).to.be.true();
      logStub.warn.reset();
    });

    lab.test('if _insertEntry is not a function', async () => {
      // Arrange
      driverStub._insertEntry = {};

      // Act
      await migrator.createMigrationsTable();

      // Assert
      Code.expect(logStub.warn.calledOnce).to.be.true();
      Code.expect(driverStub._createList.calledOnce).to.be.true();
      logStub.warn.reset();
    });
  });

  lab.experiment('write migration records', () => {
    lab.test('should be successful', () => {
      // Arrange
      const callbackStub = sinon.stub();
      const completedMigration = {
        name: '20180330020329-thisMigrationIsCompleted'
      };
      driverStub.addMigrationRecord = sinon.stub().callsFake(function () {
        Code.expect(arguments[0]).to.be.equal(
          `${_internals.matching}/${completedMigration.name}`
        );
        Code.expect(arguments[1]).to.be.instanceOf(Function);
        arguments[1]();
      });

      // Act
      migrator.writeMigrationRecord(completedMigration, callbackStub);

      // Assert
      Code.expect(driverStub.addMigrationRecord.calledOnce).to.be.true();
      Code.expect(callbackStub.calledOnce).to.be.true();
    });
  });

  lab.experiment('delete migration records', () => {
    lab.test('should be successful', () => {
      // Arrange
      const callbackStub = sinon.stub();
      const deletedMigration = {
        name: '20180330020329-thisMigrationIsDeleted'
      };
      driverStub.deleteMigration = sinon.stub().callsFake(function () {
        Code.expect(arguments[0]).to.be.equal(
          `${_internals.matching}/${deletedMigration.name}`
        );
        Code.expect(arguments[1]).to.be.instanceOf(Function);
        arguments[1]();
      });

      // Act
      migrator.deleteMigrationRecord(deletedMigration, callbackStub);

      // Assert
      Code.expect(driverStub.deleteMigration.calledOnce).to.be.true();
      Code.expect(callbackStub.calledOnce).to.be.true();
    });
  });

  // lab.experiment('sync migrations', () => {
  //   let loadFromDatabaseStub;

  //   lab.afterEach(() => {
  //     loadFromDatabaseStub.reset();
  //   });

  //   lab.test('should return the migrations to be run', () => {
  //     // Arrange
  //     const callbackStub = sinon.stub();
  //     const completedMigration = {
  //       name: '20180330020329-thisMigrationIsCompleted'
  //     };
  //     loadFromDatabaseStub = sinon
  //       .stub(require('../../lib/file'), 'loadFromDatabase')
  //       .resolves([completedMigration]);

  //     // Act
  //     migrator.sync(null, callbackStub);

  //     // Assert
  //   });
  // });
});
