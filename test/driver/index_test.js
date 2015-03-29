var vows = require('vows');
var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');

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

var indexConnectCallback = function(self, tunnelStub, driverSpy) {
  return function(err, db) {
    if (err) {
      self.callback(err, db, tunnelStub, driverSpy);
      return;
    }
    db.close(function() {
      self.callback(err, db, tunnelStub, driverSpy);
    });
  }
};

vows.describe('index').addBatch({
  'a connection with ssh tunnel': {
    topic: function() {
      // Ensure that require gets a new copy of the module for each test
      delete require.cache[require.resolve('../../lib/driver/mysql')];
      var driver = require('../../lib/driver/mysql');

      // Set up stubs/spies to verify correct flow
      var driverSpy = sinon.spy(driver, 'connect');
      var tunnelStub = sinon.stub().callsArg(1);

      var index = proxyquire('../../lib/driver/index', {
        'tunnel-ssh': tunnelStub,
        './mysql': driver
      });

      index.connect(validDbConfigWithTunnel, {}, indexConnectCallback(this, tunnelStub, driverSpy));
    },
    'should call tunnel once with db config properties added': function(err, db, tunnelStub) {
      var expectedTunnelConfig = {
        localPort: 'localPort',
        host: 'sshHost',
        port: 'sshPort',
        dstHost: 'dbHost',
        dstPort: 'dbPort'
      };

      assert.isNull(err);
      assert.isNotNull(db);
      assert(tunnelStub.withArgs(expectedTunnelConfig).calledOnce);
    },
    'should replace the db host and port with localhost and the tunnel localPort': function(err, db, tunnelStub, driverSpy) {
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

      assert(driverSpy.withArgs(expectedDbConfig).calledOnce);
    },
    teardown: function(db, tunnelStub, driverSpy) {
      driverSpy.restore();
    }
  },
  'a failed tunnel connection': {
    topic: function() {
      // Ensure that require gets a new copy of the module for each test
      delete require.cache[require.resolve('../../lib/driver/mysql')];
      var driver = require('../../lib/driver/mysql');

      // Set up stubs/spies to verify correct flow
      var tunnelStub = sinon.stub().callsArgWith(1, new Error("error"));
      var driverSpy = sinon.spy(driver, 'connect');

      var index = proxyquire('../../lib/driver/index', {
        'tunnel-ssh': tunnelStub,
        './mysql': driver
      });

      index.connect(validDbConfigWithTunnel, {}, indexConnectCallback(this, tunnelStub, driverSpy));
    },
    'should pass the error to the callback': function (err, db) {
      assert(err, "err should be non-null");
      assert(!db, "driver should be null or undefined");
    },
    'should call tunnel, but not driver.connect': function (err, db, tunnelStub, driverSpy) {
      assert(tunnelStub.calledOnce, "tunnel should be called once");
      assert(driverSpy.notCalled, "driver.connect should not be called");
    }
  }
}).export(module);