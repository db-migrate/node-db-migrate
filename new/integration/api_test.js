var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var DBMigrate = require('../../');
var path = require('path');
var cp = require('child_process');

lab.experiment('api', function() {

  lab.test('force process exit after migrations have been run',
    function(done, onCleanup) {

    var process_exit = process.exit,
        argv = process.argv;

    var called = false,
        config = { cwd: __dirname };

    onCleanup(teardown);

    createMigration(function() {

      var dbmigrate = DBMigrate.getInstance(true, config);

      dbmigrate.setConfigParam('force-exit', true);
      dbmigrate.silence(true);

      dbmigrate.up();
    });

    function validate() {

      Code.expect(called).to.equal(true);
      done();
    }

    /**
      * Create a migration with the programatic API and overwrite process.exit.
      */
    function createMigration(callback) {

      var api = DBMigrate.getInstance(true, config);
      api.silence(true);

      api.create( 'test', function() {
        process.exit = function(err) {

          var ret = called;
          called = true;

          process.exit = process_exit;

          if(err)
            process.exit.apply(arguments);

          Code.expect(ret).to.equal(false);
          validate();
        };

        callback();
      } );
    }

    function teardown(next) {

      process.exit = process_exit;
      process.argv = argv;
      cp.exec('rm -r ' + path.join(__dirname, 'migrations'), this.callback);
      return next();
    }
  });

  lab.test('should load config from parameter', function(done) {

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

    var api = DBMigrate.getInstance(true, options);
    var actual = api.config;
    var expected = options.config;

    delete expected.getCurrent;
    delete actual.getCurrent;

    Code.expect(actual).to.equal(expected);
    done();
  });
});
