var proxyquire = require('proxyquire').noPreserveCache();
var sinon = require('sinon');
var Code = require('@hapi/code');
var Lab = require('@hapi/lab');
var lab = (exports.lab = Lab.script());

var tunnelConfig = () => ({
  driver: 'mysql',
  host: 'dbHost',
  port: 'dbPort',
  tunnel: {
    localPort: 'localPort',
    host: 'sshHost',
    port: 'sshPort'
  }
});

// a plugin providing the ssh tunnel, like db-migrate-plugin-tunnel-ssh
var tunnelPlugins = hookStub => ({
  overwrite: name =>
    name === 'connection:tunnel:ssh'
      ? { 'connection:tunnel:ssh': hookStub }
      : false
});

var connect = (config, intern, driver) =>
  new Promise(resolve => {
    var index = proxyquire('../../lib/driver/index', { './mysql': driver });
    index.connect(config, intern, (err, db) => resolve({ err, db }));
  });

lab.experiment('index', function () {
  var driver;
  var driverSpy;

  lab.beforeEach(() => {
    delete require.cache[require.resolve('db-migrate-mysql')];
    driver = require('db-migrate-mysql');
    driverSpy = sinon.stub(driver, 'connect').yields(null, {});
  });

  lab.afterEach(() => {
    driverSpy.restore();
    delete require.cache[require.resolve('db-migrate-mysql')];
  });

  lab.test('should connect through the tunnel of a plugin', async () => {
    var hookStub = sinon.stub().resolves();

    var { err, db } = await connect(
      tunnelConfig(),
      { plugins: tunnelPlugins(hookStub) },
      driver
    );

    Code.expect(err).to.be.null();
    Code.expect(db).to.exist();
    Code.expect(
      hookStub.withArgs({
        localPort: 'localPort',
        host: 'sshHost',
        port: 'sshPort',
        dstHost: 'dbHost',
        dstPort: 'dbPort'
      }).calledOnce
    ).to.be.true();
    Code.expect(
      driverSpy.withArgs({
        driver: 'mysql',
        host: '127.0.0.1',
        port: 'localPort',
        tunnel: { localPort: 'localPort', host: 'sshHost', port: 'sshPort' }
      }).calledOnce
    ).to.be.true();
  });

  lab.test('should share one tunnel between the connections', async () => {
    var hookStub = sinon.stub().resolves();
    var config = tunnelConfig();
    var index = proxyquire('../../lib/driver/index', { './mysql': driver });
    var intern = { plugins: tunnelPlugins(hookStub) };
    var open = () =>
      new Promise((resolve, reject) =>
        index.connect(config, intern, (err, db) => (err ? reject(err) : resolve(db)))
      );

    await open();
    await open();

    Code.expect(hookStub.calledOnce).to.be.true();
    Code.expect(config.host).to.equal('dbHost');
    Code.expect(driverSpy.callCount).to.equal(2);
    Code.expect(driverSpy.secondCall.args[0].host).to.equal('127.0.0.1');
  });

  lab.test('should fail if the tunnel can not be established', async () => {
    var hookStub = sinon.stub().rejects(new Error('tunnel failed'));

    var { err, db } = await connect(
      tunnelConfig(),
      { plugins: tunnelPlugins(hookStub) },
      driver
    );

    Code.expect(err.message).to.equal('tunnel failed');
    Code.expect(db).to.not.exist();
    Code.expect(driverSpy.notCalled).to.be.true();
  });

  lab.test('should ask for the plugin if no plugin provides the tunnel', async () => {
    var { err, db } = await connect(
      tunnelConfig(),
      { plugins: { overwrite: () => false } },
      driver
    );

    Code.expect(err.message).to.include('npm install db-migrate-plugin-tunnel-ssh');
    Code.expect(db).to.not.exist();
    Code.expect(driverSpy.notCalled).to.be.true();
  });
});
