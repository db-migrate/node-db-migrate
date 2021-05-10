'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const config = require('../../lib/config');
const path = require('path');

//#region Variables
const _configLoad = config.load;
const _configLoadUrl = config.loadUrl;
//#endregion

// Tests
lab.experiment('config', () => {
  lab.experiment('loading from a file', () => {
    const configPath = path.join(__dirname, 'database.json');
    const _configEnv = ['dev', 'test', 'prod'];
    let _config;

    lab.test('should export all environment settings', () => {
      for (const env of _configEnv) {
        _config = config.load(configPath, env);
        Code.expect(_config[env]).to.exists();
      }
    });

    lab.test('should export a getCurrent function with all current environment settings', () => {
      let current;
      for (const env of _configEnv) {
        _config = config.load(configPath, env);
        Code.expect(_config.getCurrent).to.exists();
        current = _config.getCurrent();
        Code.expect(current.env).to.equal(env);
        Code.expect(current.settings.driver).to.equal('sqlite3');
        Code.expect(current.settings.filename).to.equal(
          current.env === 'prod' ? 'prod.db' : ':memory:'
        );
      }
    });
  });

  lab.experiment('loading from a broken config file', () => {
    const configPath = path.join(__dirname, 'database_with_syntax_error.json');

    lab.test('should throw a syntax error', async () => {
      Code.expect(
        config.load.bind(this, configPath, 'dev'),
        'Expected broken file to produce syntax error'
      ).to.throw(SyntaxError);
    });
  });

  lab.experiment('loading from a file with default env option', () => {
    const configPath = path.join(__dirname, 'database_with_default_env.json');
    const _config = config.load(configPath);

    lab.test('should load a value from the default env', () => {
      const current = _config.getCurrent();
      Code.expect(current.env).to.equal('local');
      Code.expect(current.settings.driver).to.equal('sqlite3');
      Code.expect(current.settings.filename).to.equal(':memory:');
    });
  });

  lab.experiment('loading from a file with default env option in ENV variable', () => {
    process.env.NODE_ENV = 'local';
    const configPath = path.join(
      __dirname,
      'database_with_default_env_from_env.json'
    );
    const _config = config.load(configPath);

    lab.test('should load a value from the env set in NODE_ENV', () => {
      const current = _config.getCurrent();
      Code.expect(current.settings.driver).to.equal('sqlite3');
      Code.expect(current.settings.filename).to.equal(':memory:');
    });
  });

  lab.experiment('loading from a file with ENV vars', () => {
    process.env.DB_MIGRATE_TEST_VAR = 'username_from_env';
    const configPath = path.join(__dirname, 'database_with_env.json');
    const _config = config.load(configPath, 'prod');

    lab.test('should load a value from the environments', () => {
      Code.expect(_config.prod.username).to.equal('username_from_env');
    });
  });

  lab.experiment('loading from a file with ENV URL', () => {
    process.env.DB_MIGRATE_TEST_VAR = 'postgres://uname:pw@server.com/dbname';
    const configPath = path.join(__dirname, 'database_with_env_url.json');
    const _config = config.load(configPath, 'prod');

    lab.test('should load a value from the environments', () => {
      const current = _config.getCurrent();
      Code.expect(current.settings.driver).to.equal('postgres');
      Code.expect(current.settings.user).to.equal('uname');
      Code.expect(current.settings.password).to.equal('pw');
      Code.expect(current.settings.host).to.equal('server.com');
      Code.expect(current.settings.database).to.equal('dbname');
    });
  });

  lab.experiment('loading from an URL', () => {
    const databaseUrl = 'postgres://uname:pw@server.com/dbname';
    const _config = config.loadUrl(databaseUrl, 'dev');

    lab.test('should export the settings as the current environment', () => {
      Code.expect(_config.dev).to.exists();
    });

    lab.test(
      'should export a getCurrent function with all current environment settings',
      () => {
        Code.expect(_config.getCurrent).to.exists();
        const current = _config.getCurrent();
        Code.expect(current.env).to.equal('dev');
        Code.expect(current.settings.driver).to.equal('postgres');
        Code.expect(current.settings.user).to.equal('uname');
        Code.expect(current.settings.password).to.equal('pw');
        Code.expect(current.settings.host).to.equal('server.com');
        Code.expect(current.settings.database).to.equal('dbname');
      }
    );
  });

  lab.experiment('loading a config with null values', () => {
    const configPath = path.join(__dirname, 'database_with_null_values.json');
    config.load = _configLoad;
    config.loadUrl = _configLoadUrl;

    lab.test('should something', () => {
      Code.expect(config.load.bind(this, configPath, 'dev')).to.not.throw();
    });
  });

  lab.experiment('loading a url from url property', () => {
    lab.test('should export a valid config', () => {
      const databaseUrl = {
        dev: {
          url: 'postgres://uname:pw@server.com/dbname'
        }
      };
      const cfg = config.loadObject(databaseUrl, 'dev');

      Code.expect(cfg.getCurrent).to.exists();
      const current = cfg.getCurrent();
      Code.expect(current.env).to.equal('dev');
      Code.expect(current.settings.url).to.not.exists();
      Code.expect(current.settings.driver).to.equal('postgres');
      Code.expect(current.settings.user).to.equal('uname');
      Code.expect(current.settings.password).to.equal('pw');
      Code.expect(current.settings.host).to.equal('server.com');
      Code.expect(current.settings.database).to.equal('dbname');
    });

    lab.test('should export the value if specified in suboject', () => {
      const databaseUrl = {
        dev: {
          url: {
            value: 'http://example.com'
          }
        }
      };
      const cfg = config.loadObject(databaseUrl, 'dev');

      Code.expect(cfg.getCurrent).to.exists();
      const current = cfg.getCurrent();
      Code.expect(current.env).to.equal('dev');
      Code.expect(current.settings.url).to.equal('http://example.com');
    });
  });

  lab.experiment('loading from an URL and overwriting it', () => {
    const databaseUrl = {
      dev: {
        url: 'postgres://uname:pw@server.com/dbname',
        overwrite: {
          ssl: true
        }
      }
    };

    const cfg = config.loadObject(databaseUrl, 'dev');

    lab.test('should export the settings as the current environment', () => {
      Code.expect(cfg.dev).to.exists();
    });

    lab.test(
      'should export a getCurrent function with all current environment settings',
      () => {
        Code.expect(cfg.getCurrent).to.exists();
        const current = cfg.getCurrent();
        Code.expect(current.env).to.equal('dev');
        Code.expect(current.settings.url).to.not.exists();
        Code.expect(current.settings.overwrite).to.not.exists();
        Code.expect(current.settings.driver).to.equal('postgres');
        Code.expect(current.settings.user).to.equal('uname');
        Code.expect(current.settings.password).to.equal('pw');
        Code.expect(current.settings.host).to.equal('server.com');
        Code.expect(current.settings.database).to.equal('dbname');
        Code.expect(current.settings.ssl).to.equal(true);
      }
    );
  });

  lab.experiment('loading from an ENV URL within the object and overwriting it', () => {
    lab.test('should export a getCurrent function with all current environment settings', (flags) => {
      process.env.DATABASE_URL = 'postgres://uname:pw@server.com/dbname';
      const databaseUrl = {
        dev: {
          url: { ENV: 'DATABASE_URL' },
          overwrite: {
            ssl: true
          }
        }
      };
      const cfg = config.loadObject(databaseUrl, 'dev');

      flags.onCleanup = () => {
        delete process.env.DATABASE_URL;
      };

      Code.expect(cfg.getCurrent).to.exists();
      const current = cfg.getCurrent();
      Code.expect(current.env).to.equal('dev');
      Code.expect(current.settings.url).to.not.exists();
      Code.expect(current.settings.overwrite).to.not.exists();
      Code.expect(current.settings.driver).to.equal('postgres');
      Code.expect(current.settings.user).to.equal('uname');
      Code.expect(current.settings.password).to.equal('pw');
      Code.expect(current.settings.host).to.equal('server.com');
      Code.expect(current.settings.database).to.equal('dbname');
      Code.expect(current.settings.ssl).to.equal(true);
    });
  });

  lab.experiment('loading from an ENV URL within the object and extending it from the ENV', () => {
    lab.test('', function (flags) {
      process.env.DATABASE_URL = 'postgres://uname:pw@server.com/dbname?ssl=false&testing=false';
      const databaseUrl = {
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
      const cfg = config.loadObject(databaseUrl, 'dev');

      flags.onCleanup = () => {
        delete process.env.DATABASE_URL;
      };

      Code.expect(cfg.getCurrent).to.exists();
      const current = cfg.getCurrent();
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
    });
  });
});
