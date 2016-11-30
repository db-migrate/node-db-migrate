var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var sinon = require('sinon');
var proxyquire = require('proxyquire').noPreserveCache();

lab.experiment('api', function() {

  lab.test('force process exit after migrations have been run',
    { parallel : true}, function(done, onCleanup) {

    var process_exit = process.exit,
        argv = process.argv,
        called = false,
        config = { cwd: __dirname };

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
});

function stubApiInstance(isModule, stubs, options, callback) {

  delete require.cache[require.resolve('../../api.js')];
  delete require.cache[require.resolve('optimist')];
  var mod = proxyquire('../../api.js', stubs),
  plugins = {};

  return new mod(plugins, isModule, options, callback);
};
