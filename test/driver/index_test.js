'use strict';

//#region  Imports
var proxyquire = require('proxyquire').noPreserveCache();
var sinon = require('sinon');
var Code = require('@hapi/code');
var Lab = require('@hapi/lab');
var lab = (exports.lab = Lab.script());
//#endregion

//#region  Variables
var validDbConfigWithTunnel = {
  driver: 'mysql',
  host: 'dbHost',
  port: 'dbPort',
  tunnel: {
    localPort: 'localPort',
    host: 'sshHost',
    port: 'sshPort'
  }
};
//#endregion

//#region Functions
var indexConnectCallback = function (tunnelStub, driverSpy, callback) {
  return function (err, db) {
    if (err) {
      callback(err, db, tunnelStub, driverSpy);
      return;
    }

    callback(err, db, tunnelStub, driverSpy);
  };
};
//#endregion

// Tests
lab.experiment('index', () => {
  lab.test('a successful connection with ssh tunnel with expected parameters', (flags) => {
    // Ensure that require gets a new copy of the module for each test
    delete require.cache[require.resolve('db-migrate-mysql')];
    var driver = require('db-migrate-mysql');

    // Set up stubs/spies to verify correct flow
    var driverSpy = sinon.stub(driver, 'connect').yields(null, {});
    var tunnelStub = sinon.stub().callsArg(1);

    var index = proxyquire('../../lib/driver/index', {
      'tunnel-ssh': tunnelStub,
      './mysql': driver
    });

    // register clean up
    flags.onCleanup = () => {
      driverSpy.restore();
      delete require.cache[require.resolve('tunnel-ssh')];
      delete require.cache[require.resolve('db-migrate-mysql')];
    };

    index.connect(
      validDbConfigWithTunnel,
      {},
      indexConnectCallback(tunnelStub, driverSpy, validate)
    );

    function validate (err, db, tunnelStub, driverSpy) {
      var expectedTunnelConfig = {
        localPort: 'localPort',
        host: 'sshHost',
        port: 'sshPort',
        dstHost: 'dbHost',
        dstPort: 'dbPort'
      };
      var expectedDbConfig = {
        driver: 'mysql',
        host: '127.0.0.1',
        port: 'localPort',
        tunnel: {
          localPort: 'localPort',
          host: 'sshHost',
          port: 'sshPort'
        }
      };

      Code.expect(err).to.be.null();
      Code.expect(db).to.not.be.null();
      Code.expect(
        tunnelStub.withArgs(expectedTunnelConfig).calledOnce
      ).to.be.true();
      Code.expect(
        driverSpy.withArgs(expectedDbConfig).calledOnce
      ).to.be.true();
    }
  });

  lab.test('a failed connection with ssh tunnel', (flags) => {
    // Ensure that require gets a new copy of the module for each test
    delete require.cache[require.resolve('db-migrate-mysql')];
    var driver = require('db-migrate-mysql');

    // Set up stubs/spies to verify correct flow
    var tunnelStub = sinon.stub().callsArgWith(1, new Error('error'));
    var driverSpy = sinon.stub(driver, 'connect').yields(null, {});
    var index = proxyquire('../../lib/driver/index', {
      'tunnel-ssh': tunnelStub,
      './mysql': driver
    });

    index.connect(
      validDbConfigWithTunnel,
      {},
      indexConnectCallback(tunnelStub, driverSpy, validate)
    );

    // register clean up
    flags.onCleanup = () => {
      driverSpy.restore();
      delete require.cache[require.resolve('tunnel-ssh')];
      delete require.cache[require.resolve('db-migrate-mysql')];
    };

    function validate (err, db, tunnelStub, driverSpy) {
      Code.expect(err, 'err should be non-null').to.exists();
      Code.expect(db, 'driver should be null or undefined').to.not.exists();

      Code.expect(
        tunnelStub.calledOnce,
        'tunnel should be called once'
      ).to.be.true();
      Code.expect(
        driverSpy.notCalled,
        'driver.connect should not be called'
      ).to.be.true();
    }
  });

  lab.test('privateKey gets set as expected', (flags) => {
    // Ensure that require gets a new copy of the module for each test
    delete require.cache[require.resolve('db-migrate-mysql')];
    var driver = require('db-migrate-mysql');
    var fs = { readFileSync: sinon.stub().returns('sshkey') };

    // Set up stubs/spies to verify correct flow
    var driverSpy = sinon.stub(driver, 'connect').yields(null, {});
    var tunnelStub = sinon.stub().callsArg(1);

    var index = proxyquire('../../lib/driver/index', {
      'tunnel-ssh': tunnelStub,
      fs: fs,
      './mysql': driver
    });

    // register clean up
    flags.onCleanup = () => {
      driverSpy.restore();

      delete require.cache[require.resolve('tunnel-ssh')];
      delete require.cache[require.resolve('db-migrate-mysql')];
    };

    validDbConfigWithTunnel.tunnel.privateKeyPath = '/test/key';

    index.connect(
      validDbConfigWithTunnel,
      {},
      indexConnectCallback(tunnelStub, driverSpy, validate)
    );

    function validate (err, db, tunnelStub, driverSpy) {
      var expectedTunnelConfig = {
        localPort: 'localPort',
        host: 'sshHost',
        port: 'sshPort',
        privateKeyPath: '/test/key',
        dstHost: '127.0.0.1',
        dstPort: 'localPort',
        privateKey: 'sshkey'
      };
      var expectedDbConfig = {
        driver: 'mysql',
        host: '127.0.0.1',
        port: 'localPort',
        tunnel: {
          localPort: 'localPort',
          host: 'sshHost',
          port: 'sshPort',
          privateKeyPath: '/test/key'
        }
      };

      Code.expect(err).to.be.null();
      Code.expect(db).to.not.be.null();
      Code.expect(
        fs.readFileSync.withArgs(validDbConfigWithTunnel.tunnel.privateKeyPath)
          .calledOnce
      ).to.be.true();
      Code.expect(
        tunnelStub.withArgs(expectedTunnelConfig).calledOnce
      ).to.be.true();
      Code.expect(driverSpy.withArgs(expectedDbConfig).calledOnce).to.be.true();
    }
  });
});
