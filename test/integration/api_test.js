var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var sinon = require('sinon');
var proxyquire = require('proxyquire').noPreserveCache();
var Promise = require('bluebird');

lab.experiment('api', { parallel: true }, function() {

  lab.test('force process exit after migrations have been run',
    { parallel : true}, function(done, onCleanup) {

    var process_exit = process.exit,
        argv = process.argv,
        called = false,
        config = {};

    // register cleanup method and start preparing the test
    onCleanup(teardown);
    overwriteExit();

    var dbmigrate = stubApiInstance(true, {
      './lib/commands/up.js': upStub
    }, config);

    dbmigrate.setConfigParam('force-exit', true);
    dbmigrate.silence(true);

    /**
      * We have set force-exit above, this should end up in db-migrate
      * executing process.exit on the final callback.
      * Process.exit has been overwritten and will finally call validate.
      *
      * The test validation takes place in validate()
      */
    dbmigrate.up();

    /**
      * Final validation after process.exit should have been called.
      */
    function validate() {

      Code.expect(called).to.be.true();
      done();
    }

    function upStub(internals) {

      internals.onComplete({
        driver: {
          close: sinon.stub().callsArg(0)
        }
      }, internals);
    }

    /**
      * Create a migration with the programatic API and overwrite process.exit.
      */
    function overwriteExit() {

      process.exit = function(err) {

        var ret = called;
        called = true;

        process.exit = process_exit;

        if(err)
          process.exit.apply(arguments);

        Code.expect(ret).to.be.false();
        validate();
      };
    }

    function teardown(next) {

      process.exit = process_exit;
      process.argv = argv;
      return next();
    }
  });

  lab.test('should load config from parameter', { parallel : true},
    function(done) {

    var options = {
      env: 'dev',
      cwd: process.cwd() + '/test/integration',
      config: {
        dev: {
          driver: 'sqlite3',
          filename: ':memory:'
        },
        pg: {
          driver: 'pg',
          database: 'db_api_test'
        }
      }
    };

    var api = stubApiInstance(true, {}, options);
    var actual = api.config;
    var expected = options.config;

    delete expected.getCurrent;
    delete actual.getCurrent;

    Code.expect(actual).to.equal(expected);
    done();
  });

  lab.test('should handle all up parameter variations properly',
    { parallel: true }, function() {

    return Promise.resolve([
      [], // promise
      [sinon.spy()],
      ['nameatargetmigration', sinon.spy()], // targeted migration
      ['nameatargetmigration'], // promise targeted migration
      [1, sinon.spy()], // targeted migration
      [1], // promise targeted migration
      ['nameatargetmigration', 'testscope', sinon.spy()], // scoped target
      ['nameatargetmigration', 'testscope'], // promise scope target
      [1, 'testscope', sinon.spy()], // scoped target
      [1, 'testscope'] // promise scope target
    ])
    .each(defaultExecParams('up'))
    .each(spyCallback);
  });

  lab.test('should handle all down parameter variations properly',
    { parallel: true }, function() {

      return Promise.resolve([
        [], // promise
        [sinon.spy()],
        [1, sinon.spy()], // targeted migration
        [1], // promise targeted migration
        [1, 'testscope', sinon.spy()], // scoped target
        [1, 'testscope'] // promise scope target
      ])
      .each(defaultExecParams('down'))
      .each(spyCallback);
  });

  lab.test('should handle all reset parameter variations properly',
    { parallel: true }, function() {

      return Promise.resolve([
        [], // promise
        [sinon.spy()],
        ['testscope', sinon.spy()], // scoped target
        ['testscope'] // promise scope target
      ])
      .each(defaultExecParams('reset'))
      .each(spyCallback);
  });

  lab.test('should handle all sync parameter variations properly',
    { parallel: true }, function() {

    return Promise.resolve([
      [],
      ['nameatargetmigration', sinon.spy()], // targeted migration
      ['nameatargetmigration'], // promise targeted migration
      ['nameatargetmigration', 'testscope', sinon.spy()], // scoped target
      ['nameatargetmigration', 'testscope'], // promise scope target
    ])
    .each(defaultExecParams('sync'))
    .each(spyCallback);
  });
});

function defaultExecParams(method) {

  return function(args, index) {

    var stubs = {};
    stubs['./lib/commands/' + method + '.js'] = stub;

    var api = stubApiInstance(true, stubs);

    return [ api[method].apply(api, args), args ];

    function stub(internals, config, callback) {

      if(typeof(args[0]) === 'string') {

        Code.expect(internals.argv.destination).to.equal(args[0]);
      } else if(typeof(args[0]) === 'number') {

        Code.expect(internals.argv.count).to.equal(args[0]);
      }

      if(typeof(args[1]) === 'string') {

        Code.expect(internals.migrationMode).to.equal(args[1]);
        Code.expect(internals.matching).to.equal(args[1]);
      }

      callback();
    }
  };
}

function spyCallback(api, args) {

  if(typeof(args[args.length - 1]) === 'function') {

    var spy = args[args.length - 1];
    Code.expect(spy.called).to.be.true();
  }
}

function stubApiInstance(isModule, stubs, options, callback) {

  delete require.cache[require.resolve('../../api.js')];
  delete require.cache[require.resolve('optimist')];
  var mod = proxyquire('../../api.js', stubs),
  plugins = {};
  options = options || {};

  options = Object.assign(options, {
    throwUncatched: true,
    cwd: __dirname
  });

  return new mod(plugins, isModule, options, callback);
}
