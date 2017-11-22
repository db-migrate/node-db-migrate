var Code = require('code');
var Lab = require('lab');
var lab = (exports.lab = Lab.script());
var config = require('../lib/config');
var path = require('path');

var _configLoad = config.load;
var _configLoadUrl = config.loadUrl;

lab.experiment('config', function () {
  lab.experiment('loading from a file', function () {
    var configPath = path.join(__dirname, 'database.json');
    var _config = config.load(configPath, 'dev');

    lab.test(
      'should export all environment settings',

      function (done) {
        Code.expect(_config.dev).to.exists();
        Code.expect(_config.test).to.exists();
        Code.expect(_config.prod).to.exists();
        done();
      }
    );

    lab.test(
      'should export a getCurrent function with all current ' +
        'environment settings',

      function (done) {
        var current;
        Code.expect(_config.getCurrent).to.exists();
        current = _config.getCurrent();
        Code.expect(current.env).to.equal('dev');
        Code.expect(current.settings.driver).to.equal('sqlite3');
        Code.expect(current.settings.filename).to.equal(':memory:');
        done();
      }
    );
  });

  lab.experiment(
    'loading from a broken config file',

    function () {
      var configPath = path.join(__dirname, 'database_with_syntax_error.json');

      lab.test('should throw a syntax error', function (done) {
        Code.expect(
          config.load.bind(this, configPath, 'dev'),
          'Expected broken file to produce syntax error'
        ).to.throw(SyntaxError);
        done();
      });
    }
  );

  lab.experiment(
    'loading from a file with default env option',

    function () {
      var configPath = path.join(__dirname, 'database_with_default_env.json');
      var _config = config.load(configPath);

      lab.test(
        'should load a value from the default env',

        function (done) {
          var current = _config.getCurrent();
          Code.expect(current.env).to.equal('local');
          Code.expect(current.settings.driver).to.equal('sqlite3');
          Code.expect(current.settings.filename).to.equal(':memory:');
          done();
        }
      );
    }
  );

  lab.experiment(
    'loading from a file with default env option in ENV variable',

    function () {
      process.env.NODE_ENV = 'local';
      var configPath = path.join(
        __dirname,
        'database_with_default_env_from_env.json'
      );
      var _config = config.load(configPath);

      lab.test(
        'should load a value from the env set in NODE_ENV',

        function (done) {
          var current = _config.getCurrent();
          Code.expect(current.settings.driver).to.equal('sqlite3');
          Code.expect(current.settings.filename).to.equal(':memory:');
          done();
        }
      );
    }
  );

  lab.experiment(
    'loading from a file with ENV vars',

    function () {
      process.env.DB_MIGRATE_TEST_VAR = 'username_from_env';
      var configPath = path.join(__dirname, 'database_with_env.json');
      var _config = config.load(configPath, 'prod');

      lab.test(
        'should load a value from the environments',

        function (done) {
          Code.expect(_config.prod.username).to.equal('username_from_env');
          done();
        }
      );
    }
  );

  lab.experiment(
    'loading from a file with ENV URL',

    function () {
      process.env.DB_MIGRATE_TEST_VAR = 'postgres://uname:pw@server.com/dbname';
      var configPath = path.join(__dirname, 'database_with_env_url.json');
      var _config = config.load(configPath, 'prod');

      lab.test(
        'should load a value from the environments',

        function (done) {
          var current = _config.getCurrent();
          Code.expect(current.settings.driver).to.equal('postgres');
          Code.expect(current.settings.user).to.equal('uname');
          Code.expect(current.settings.password).to.equal('pw');
          Code.expect(current.settings.host).to.equal('server.com');
          Code.expect(current.settings.database).to.equal('dbname');
          done();
        }
      );
    }
  );

  lab.experiment('loading from an URL', function () {
    var databaseUrl = 'postgres://uname:pw@server.com/dbname';
    var _config = config.loadUrl(databaseUrl, 'dev');

    lab.test(
      'should export the settings as the current environment',

      function (done) {
        Code.expect(_config.dev).to.exists();
        done();
      }
    );

    lab.test(
      'should export a getCurrent function with all current ' +
        'environment settings',

      function (done) {
        var current;
        Code.expect(_config.getCurrent).to.exists();
        current = _config.getCurrent();
        Code.expect(current.env).to.equal('dev');
        Code.expect(current.settings.driver).to.equal('postgres');
        Code.expect(current.settings.user).to.equal('uname');
        Code.expect(current.settings.password).to.equal('pw');
        Code.expect(current.settings.host).to.equal('server.com');
        Code.expect(current.settings.database).to.equal('dbname');
        done();
      }
    );
  });

  lab.experiment('loading a config with null values', function () {
    var configPath = path.join(__dirname, 'database_with_null_values.json');
    config.load = _configLoad;
    config.loadUrl = _configLoadUrl;

    lab.test('should something', function (done) {
      Code.expect(config.load.bind(this, configPath, 'dev')).to.not.throw();
      done();
    });
  });

  lab.experiment('loading a url from url property', function () {
    lab.test('should export a valid config', function (done) {
      var databaseUrl = {
        dev: {
          url: 'postgres://uname:pw@server.com/dbname'
        }
      };
      var cfg = config.loadObject(databaseUrl, 'dev');

      Code.expect(cfg.getCurrent).to.exists();
      var current = cfg.getCurrent();
      Code.expect(current.env).to.equal('dev');
      Code.expect(current.settings.url).to.not.exists();
      Code.expect(current.settings.driver).to.equal('postgres');
      Code.expect(current.settings.user).to.equal('uname');
      Code.expect(current.settings.password).to.equal('pw');
      Code.expect(current.settings.host).to.equal('server.com');
      Code.expect(current.settings.database).to.equal('dbname');

      done();
    });

    lab.test('should export the value if specified in suboject', function (
      done
    ) {
      var databaseUrl = {
        dev: {
          url: {
            value: 'http://example.com'
          }
        }
      };
      var cfg = config.loadObject(databaseUrl, 'dev');

      Code.expect(cfg.getCurrent).to.exists();
      var current = cfg.getCurrent();
      Code.expect(current.env).to.equal('dev');
      Code.expect(current.settings.url).to.equal('http://example.com');

      done();
    });
  });

  lab.experiment('loading from an URL and overwriting it', function () {
    var databaseUrl = {
      dev: {
        url: 'postgres://uname:pw@server.com/dbname',
        overwrite: {
          ssl: true
        }
      }
    };

    var cfg = config.loadObject(databaseUrl, 'dev');

    lab.test('should export the settings as the current environment', function (
      done
    ) {
      Code.expect(cfg.dev).to.exists();
      done();
    });

    lab.test(
      'should export a getCurrent function with all current environment settings',
      function (done) {
        Code.expect(cfg.getCurrent).to.exists();
        var current = cfg.getCurrent();
        Code.expect(current.env).to.equal('dev');
        Code.expect(current.settings.url).to.not.exists();
        Code.expect(current.settings.overwrite).to.not.exists();
        Code.expect(current.settings.driver).to.equal('postgres');
        Code.expect(current.settings.user).to.equal('uname');
        Code.expect(current.settings.password).to.equal('pw');
        Code.expect(current.settings.host).to.equal('server.com');
        Code.expect(current.settings.database).to.equal('dbname');
        Code.expect(current.settings.ssl).to.equal(true);

        done();
      }
    );
  });

  lab.experiment(
    'loading from an ENV URL within the object and overwriting it',
    function () {
      lab.test(
        'should export a getCurrent function with all current environment settings',
        function (done, cleanup) {
          process.env.DATABASE_URL = 'postgres://uname:pw@server.com/dbname';
          var databaseUrl = {
            dev: {
              url: { ENV: 'DATABASE_URL' },
              overwrite: {
                ssl: true
              }
            }
          };
          var cfg = config.loadObject(databaseUrl, 'dev');

          cleanup(function (next) {
            delete process.env.DATABASE_URL;
            next();
          });

          Code.expect(cfg.getCurrent).to.exists();
          var current = cfg.getCurrent();
          Code.expect(current.env).to.equal('dev');
          Code.expect(current.settings.url).to.not.exists();
          Code.expect(current.settings.overwrite).to.not.exists();
          Code.expect(current.settings.driver).to.equal('postgres');
          Code.expect(current.settings.user).to.equal('uname');
          Code.expect(current.settings.password).to.equal('pw');
          Code.expect(current.settings.host).to.equal('server.com');
          Code.expect(current.settings.database).to.equal('dbname');
          Code.expect(current.settings.ssl).to.equal(true);

          done();
        }
      );
    }
  );

  lab.experiment(
    'loading from an ENV URL within the object and extending it from the ENV',
    function () {
      lab.test('', function (done, cleanup) {
        process.env.DATABASE_URL =
          'postgres://uname:pw@server.com/dbname?ssl=false&testing=false';
        var databaseUrl = {
          dev: {
            url: {
              ENV: 'DATABASE_URL'
            },
            overwrite: {
              ssl: true,
              cache: false
            },
            addIfNotExists: {
              native: true, // this on is new
              cache: true, // overwrite should have higher priority
              testing: true // already in config do not overwrite
            }
          }
        };
        var cfg = config.loadObject(databaseUrl, 'dev');

        cleanup(function (next) {
          delete process.env.DATABASE_URL;
          next();
        });

        Code.expect(cfg.getCurrent).to.exists();
        var current = cfg.getCurrent();
        Code.expect(current.env).to.equal('dev');
        Code.expect(current.settings.url).to.not.exists();
        Code.expect(current.settings.overwrite).to.not.exists();
        Code.expect(current.settings.addIfNotExists).to.not.exists();
        Code.expect(current.settings.driver).to.equal('postgres');
        Code.expect(current.settings.user).to.equal('uname');
        Code.expect(current.settings.password).to.equal('pw');
        Code.expect(current.settings.host).to.equal('server.com');
        Code.expect(current.settings.database).to.equal('dbname');
        Code.expect(current.settings.native).to.equal(true);
        Code.expect(current.settings.testing).to.equal('false');
        Code.expect(current.settings.cache).to.equal(false);
        Code.expect(current.settings.ssl).to.equal(true);

        done();
      });
    }
  );
});
