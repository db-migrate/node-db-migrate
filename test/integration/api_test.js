var Code = require('code');
var Lab = require('lab');
var lab = (exports.lab = Lab.script());
var sinon = require('sinon');
var proxyquire = require('proxyquire').noPreserveCache();
var Promise = require('bluebird');

lab.experiment('api', function () {
  lab.test(
    'force process exit after migrations have been run',

    function (done, onCleanup) {
      var processExit = process.exit;
      var argv = process.argv;
      var called = false;
      var config = {};

      // register cleanup method and start preparing the test
      onCleanup(teardown);
      overwriteExit();

      var dbmigrate = stubApiInstance(
        true,
        {
          './lib/commands/up': upStub
        },
        config
      );

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
      function validate () {
        Code.expect(called).to.be.true();
        done();
      }

      function upStub (internals) {
        internals.onComplete(
          {
            driver: {
              close: sinon.stub().callsArg(0)
            }
          },
          internals
        );
      }

      /**
       * Create a migration with the programatic API and overwrite process.exit.
       */
      function overwriteExit () {
        process.exit = function (err) {
          var ret = called;
          called = true;

          process.exit = processExit;

          if (err) process.exit.apply(arguments);

          Code.expect(ret).to.be.false();
          validate();
        };
      }

      function teardown (next) {
        process.exit = processExit;
        process.argv = argv;
        return next();
      }
    }
  );

  lab.test('should load config from parameter', function (done) {
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

  lab.test('should load commandline options from options parameter', function (
    done
  ) {
    var options = {
      cmdOptions: {
        'migrations-dir': './test'
      }
    };

    var api = stubApiInstance(true, {}, options);
    var actual = api.internals.argv['migrations-dir'];
    var expected = options.cmdOptions['migrations-dir'];

    delete expected.getCurrent;
    delete actual.getCurrent;

    Code.expect(actual).to.equal(expected);
    done();
  });

  lab.test(
    'should handle all up parameter variations properly',

    function () {
      return Promise.resolve([
        [], // promise
        ['nameatargetmigration'], // promise targeted migration
        [1], // promise targeted migration
        ['nameatargetmigration', 'testscope'], // promise scope target
        [1, 'testscope'] // promise scope target
      ])
        .each(defaultExecParams('up'))
        .each(spyCallback);
    }
  );

  lab.test(
    'should handle all down parameter variations properly',

    function () {
      return Promise.resolve([
        [], // promise
        [1], // promise targeted migration
        [1, 'testscope'] // promise scope target
      ])
        .each(defaultExecParams('down'))
        .each(spyCallback);
    }
  );

  lab.test(
    'should handle all check parameter variations properly',

    function () {
      return Promise.resolve([
        [], // promise
        [1], // promise targeted migration
        [1, 'testscope'] // promise scope target
      ])
        .each(defaultExecParams('check'))
        .each(spyCallback);
    }
  );

  lab.test(
    'should handle all reset parameter variations properly',

    function () {
      return Promise.resolve([
        [], // promise
        ['testscope'] // promise scope target
      ])
        .each(defaultExecParams('reset'))
        .each(spyCallback);
    }
  );

  lab.test(
    'should handle all sync parameter variations properly',

    function () {
      return Promise.resolve([
        [],
        ['nameatargetmigration'], // promise targeted migration
        ['nameatargetmigration', 'testscope'] // promise scope target
      ])
        .each(defaultExecParams('sync'))
        .each(spyCallback);
    }
  );
});

function defaultExecParams (method) {
  return function (args, index) {
    var stubs = {};
    stubs['./lib/commands/' + method] = stub;

    var api = stubApiInstance(true, stubs);

    return [api[method].apply(api, args), args];

    async function stub (internals, config) {
      if (typeof args[0] === 'string') {
        Code.expect(internals.argv.destination).to.equal(args[0]);
      } else if (typeof args[0] === 'number') {
        Code.expect(internals.argv.count).to.equal(args[0]);
      }

      if (typeof args[1] === 'string') {
        Code.expect(internals.migrationMode).to.equal(args[1]);
        Code.expect(internals.matching).to.equal(args[1]);
      }

      return Promise.resolve();
    }
  };
}

function spyCallback (api, args) {
  if (typeof args[args.length - 1] === 'function') {
    var spy = args[args.length - 1];
    Code.expect(spy.called).to.be.true();
  }
}

function stubApiInstance (isModule, stubs, options, callback) {
  delete require.cache[require.resolve('../../api.js')];
  delete require.cache[require.resolve('optimist')];
  var Mod = proxyquire('../../api.js', stubs);
  var plugins = {};
  options = options || {};

  options = Object.assign(options, {
    throwUncatched: true,
    cwd: __dirname
  });

  return new Mod(plugins, isModule, options, callback);
}
