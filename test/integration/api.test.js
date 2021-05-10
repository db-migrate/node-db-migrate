'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();
const Promise = require('bluebird');

// Tests
lab.experiment('api', () => {
  lab.test('force process exit after migrations have been run', (flags) => {
    const processExit = process.exit;
    const argv = process.argv;
    let called = false;
    const config = {};

    // register cleanup method and start preparing the test
    flags.onCleanup = teardown;
    overwriteExit();

    const dbmigrate = stubApiInstance(
      true,
      {
        up: upStub
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
        const ret = called;
        called = true;

        process.exit = processExit;

        if (err) {
          process.exit.apply(arguments);
        }

        Code.expect(ret).to.be.false();
        validate();
      };
    }

    function teardown () {
      process.exit = processExit;
      process.argv = argv;
    }
  });

  lab.test('should load config from parameter', () => {
    const options = {
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

    const api = stubApiInstance(true, {}, options);
    const actual = api.config;
    const expected = options.config;

    delete expected.getCurrent;
    delete actual.getCurrent;

    Code.expect(actual).to.equal(expected);
  });

  lab.test('should load commandline options from options parameter', () => {
    const options = {
      cmdOptions: {
        'migrations-dir': './test'
      }
    };

    const api = stubApiInstance(true, {}, options);
    const actual = api.internals.argv['migrations-dir'];
    const expected = options.cmdOptions['migrations-dir'];

    delete expected.getCurrent;
    delete actual.getCurrent;

    Code.expect(actual).to.equal(expected);
  });

  lab.test('should handle all up parameter variations properly', () => {
    return Promise.resolve([
      [], // promise
      ['nameatargetmigration'], // promise targeted migration
      [1], // promise targeted migration
      ['nameatargetmigration', 'testscope'], // promise scope target
      [1, 'testscope'] // promise scope target
    ])
      .each(defaultExecParams('up'))
      .each(spyCallback);
  });

  lab.test('should handle all down parameter variations properly', () => {
    return Promise.resolve([
      [], // promise
      [1], // promise targeted migration
      [1, 'testscope'] // promise scope target
    ])
      .each(defaultExecParams('down'))
      .each(spyCallback);
  });

  lab.test('should handle all check parameter variations properly', () => {
    return Promise.resolve([
      [], // promise
      [1], // promise targeted migration
      [1, 'testscope'] // promise scope target
    ])
      .each(defaultExecParams('check'))
      .each(spyCallback);
  });

  lab.test('should handle all reset parameter variations properly', () => {
    return Promise.resolve([
      [], // promise
      ['testscope'] // promise scope target
    ])
      .each(defaultExecParams('reset'))
      .each(spyCallback);
  });

  lab.test('should handle all sync parameter variations properly', () => {
    return Promise.resolve([
      [],
      ['nameatargetmigration'], // promise targeted migration
      ['nameatargetmigration', 'testscope'] // promise scope target
    ])
      .each(defaultExecParams('sync'))
      .each(spyCallback);
  });
});

//#region Functions
function defaultExecParams (method) {
  return function (args, index) {
    const stubs = {};
    const stub = async function (internals, config) {
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
    };

    stubs[method] = stub;
    const api = stubApiInstance(true, stubs);

    return [api[method].apply(api, args), args];
  };
}

function spyCallback (api, args) {
  if (typeof args[args.length - 1] === 'function') {
    const spy = args[args.length - 1];
    Code.expect(spy.called).to.be.true();
  }
}

/**
 * Returns a function to load local modules from `/lib/commands` for unit testing.
 * @param stubs An object containing stubbed functions.
 */
function loader (stubs) {
  const load = require('../../lib/commands');
  const keys = Object.keys(stubs);

  return function (module) {
    const index = keys.indexOf(module);
    if (index !== -1) {
      return stubs[keys[index]];
    }

    return load(module);
  };
}

/**
 * Returns either the API stubbed module instance or the original module instance for unit testing.
 * @param isModule Determines whether the loaded API is a module.
 */
function stubApiInstance (isModule, stubs, options, callback) {
  delete require.cache[require.resolve('../../api.js')];
  delete require.cache[require.resolve('yargs')];
  const Mod = proxyquire('../../api.js', {
    './lib/commands': loader(stubs)
  });
  const plugins = {};
  options = options || {};
  options = Object.assign(options, {
    throwUncatched: true,
    cwd: __dirname
  });

  return new Mod(plugins, isModule, options, callback);
}
//#endregion
