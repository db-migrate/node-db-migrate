'use strict';

module.exports.version = require('./package.json').version;

let load;
var log = require('db-migrate-shared').log;
var Promise;
let onComplete;
var config = require('rc')('db-migrate');

// constant hooks for this file
var APIHooks = {
  'init:api:addfunction:hook': function (name, fn) {
    this[name] = fn;
  },
  'init:api:accessapi:hook': function (cb) {
    return this;
  }
};

function dbmigrate (plugins, isModule, options, callback) {
  if (!options.staticLoader) load = require('./lib/commands');
  else load = require('./lib/commands/generated.js');

  onComplete = load('on-complete');

  var dotenv = require('dotenv');
  var setDefaultArgv = load('set-default-argv');

  this.internals = {
    onComplete: onComplete,
    migrationProtocol: 1,
    load
  };
  if (typeof isModule !== 'function') {
    this.internals.isModule = isModule;
  }
  var internals = this.internals;

  this.internals.plugins = load('fn/plugin')(plugins);

  if (typeof callback === 'function') this.internals.onComplete = callback;
  else if (typeof options === 'function') this.internals.onComplete = options;

  this.internals.dbm = require('./');
  this.dataType = this.internals.dbm.dataType;
  this.version = this.internals.dbm.version;

  var dotenvConfig = { silent: true };
  if (config.dotenvCustomPath) {
    dotenvConfig.path = config.dotenvCustomPath;
  }
  dotenv.load(dotenvConfig);

  /* $lab:coverage:off$ */
  if (!options || !options.throwUncatched) load('helper/register-events')();
  /* $lab:coverage:on$ */

  if (typeof options === 'object') {
    if (typeof options.config === 'string') {
      internals.configFile = options.config;
    } else if (typeof options.config === 'object') {
      internals.configObject = options.config;
    }

    if (typeof options.env === 'string') internals.currentEnv = options.env;

    if (typeof options.cwd === 'string') internals.cwd = options.cwd;
    else internals.cwd = process.cwd();

    if (typeof options.cmdOptions === 'object') {
      internals.cmdOptions = options.cmdOptions;
    }
  } else internals.cwd = process.cwd();

  if (typeof isModule === 'function') {
    this.internals.onComplete = isModule;
    setDefaultArgv(this.internals);
  } else setDefaultArgv(this.internals, isModule);

  this.config = load('helper/load-config')(
    require('./lib/config.js'),
    this.internals
  );

  // delayed loading of bluebird
  Promise = require('bluebird');
  this.internals.migrationOptions = {
    dbmigrate: {
      version: this.internals.dbm.version,
      dataType: this.internals.dbm.dataType
    },
    dryRun: this.internals.dryRun,
    cwd: this.internals.cwd,
    noTransactions: this.internals.notransactions,
    verbose: this.internals.verbose,
    type: this.internals.dbm.dataType,
    log: log,
    ignoreOnInit: this.internals.argv['ignore-on-init'],
    Promise: Promise
  };
  this.internals.safeOptions = this.internals.migrationOptions;
}

dbmigrate.prototype = {
  /**
   * Add a global defined variable to db-migrate, to enable access from
   * local migrations without configuring pathes.
   *
   * @return boolean
   */
  addGlobal: function (library) {
    try {
      require(library);
    } catch (e) {
      return false;
    }

    return true;
  },

  /**
   * Registers and initializes hooks.
   *
   * @returns Promise
   */
  registerAPIHook: function (callback) {
    var plugins = this.internals.plugins;
    var self = this;

    return Promise.resolve(Object.keys(APIHooks))
      .each(function (hook) {
        var plugin = plugins.hook(hook);
        if (!plugin) return;

        var APIHook = APIHooks[hook].bind(self);

        return Promise.resolve(plugin)
          .map(function (plugin) {
            return plugin[hook]();
          })
          .each(function (args) {
            return APIHook.apply(self, args);
          });
      })
      .asCallback(callback);
  },

  _internals: this.internals,

  /**
   * Add a configuration option to dbmigrate.
   *
   * @return boolean
   */
  addConfiguration: function (description, args, type) {
    var name = args.shift();
    this.internals.argv.describe(name, description);

    for (var i = 0; i < args.length; ++i) {
      this.internals.argv.alias(args[i], name);
    }

    switch (type) {
      case 'string':
        this.internals.argv.string(name);
        break;

      case 'boolean':
        this.internals.argv.boolean(name);
        break;

      default:
        return false;
    }

    return true;
  },

  /**
   * Resets and sets argv to a specified new argv.
   */
  resetConfiguration: function (argv) {
    this.internals.argv = argv;
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  up: function (specification, opts, callback) {
    var executeUp = load('up');

    if (arguments.length > 0) {
      if (typeof specification === 'string') {
        this.internals.argv.destination = specification;
      } else if (typeof specification === 'number') {
        this.internals.argv.count = specification;
      } else if (typeof specification === 'function') {
        callback = specification;
      }

      if (typeof opts === 'string') {
        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      } else if (typeof opts === 'function') {
        callback = opts;
      }
    }

    return Promise.resolve(executeUp(this.internals, this.config)).nodeify(
      callback
    );
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  down: function (specification, opts, callback) {
    var executeDown = load('down');

    if (arguments.length > 0) {
      if (typeof specification === 'number') {
        this.internals.argv.count = arguments[0];
      } else if (typeof specification === 'string') {
        this.internals.argv.destination = specification;
        this.internals.argv.count = Number.MAX_VALUE;
      } else if (typeof specification === 'function') {
        callback = specification;
      }

      if (typeof opts === 'string') {
        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      } else if (typeof opts === 'function') {
        callback = opts;
      }
    }

    return Promise.resolve(executeDown(this.internals, this.config)).asCallback(
      callback
    );
  },

  fix: function (specification, opts, callback) {
    var executeFix = load('fix');

    if (arguments.length > 0) {
      if (typeof specification === 'string') {
        this.internals.argv.destination = specification;
      } else if (typeof specification === 'number') {
        this.internals.argv.count = specification;
      } else if (typeof specification === 'function') {
        callback = specification;
      }

      if (typeof opts === 'string') {
        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      } else if (typeof opts === 'function') {
        callback = opts;
      }
    }

    return Promise.resolve(executeFix(this.internals, this.config)).nodeify(
      callback
    );
  },

  check: function (specification, opts, callback) {
    var executeCheck = load('check');

    if (arguments.length > 0) {
      if (typeof specification === 'number') {
        this.internals.argv.count = arguments[0];
      } else if (typeof specification === 'function') {
        callback = specification;
      }

      if (typeof opts === 'string') {
        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      } else if (typeof opts === 'function') {
        callback = opts;
      }
    }

    return Promise.resolve(
      executeCheck(this.internals, this.config)
    ).asCallback(callback);
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  sync: function (specification, opts, callback) {
    var executeSync = load('sync');

    if (arguments.length > 0) {
      if (typeof specification === 'string') {
        this.internals.argv.destination = specification;
      }

      if (typeof opts === 'string') {
        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      } else if (typeof opts === 'function') {
        callback = opts;
      }
    }

    return Promise.resolve(executeSync(this.internals, this.config)).asCallback(
      callback
    );
  },

  /**
   * Executes down for all currently migrated migrations.
   */
  reset: function (scope, callback) {
    var executeDown = load('down');

    if (typeof scope === 'string') {
      this.internals.migrationMode = scope;
      this.internals.matching = scope;
    } else if (typeof scope === 'function') {
      callback = scope;
    }

    this.internals.argv.count = Number.MAX_VALUE;
    return Promise.resolve(executeDown(this.internals, this.config)).asCallback(
      callback
    );
  },

  /**
   * Silence the log output completely.
   */
  silence: function (isSilent) {
    return log.silence(isSilent);
  },

  /**
   * Creates a correctly formatted migration
   */
  create: function (migrationName, scope, callback) {
    var executeCreateMigration = load('create-migration');
    if (typeof scope === 'function') {
      callback = scope;
    } else if (scope) {
      this.internals.migrationMode = scope;
      this.internals.matching = scope;
    }

    this.internals.argv._.unshift(migrationName);
    return Promise.resolve(
      executeCreateMigration(this.internals, this.config)
    ).asCallback(callback);
  },

  /**
   * Creates a database of the given dbname.
   */
  createDatabase: function (dbname, callback) {
    var executeDB = load('db');
    this.internals.argv._.push(dbname);
    this.internals.mode = 'create';
    return Promise.resolve(executeDB(this.internals, this.config, callback)).asCallback(
      callback
    );
  },

  /**
   * Drops a database of the given dbname.
   */
  dropDatabase: function (dbname, callback) {
    var executeDB = load('db');
    this.internals.argv._.push(dbname);
    this.internals.mode = 'drop';
    return Promise.resolve(executeDB(this.internals, this.config, callback)).asCallback(
      callback
    );
  },

  /**
   * Sets a config variable to the given value.
   *
   * @return value
   */
  setConfigParam: function (param, value) {
    return (this.internals.argv[param] = value);
  },

  /**
   * Sets the callback to the default onComplete
   */
  setDefaultCallback: function () {
    this.internals.onComplete = onComplete;
  },

  /**
   * Let's the user customize the callback, which gets called after all
   * migrations have been done.
   */
  setCustomCallback: function (callback) {
    this.internals.onComplete = callback;
  },

  /**
   * Seeds either the static or version controlled seeders, controlled by
   * the passed mode.
   */
  seed: function (mode, scope, callback) {
    var executeSeed = load('seed');
    if (scope) {
      this.internals.migrationMode = scope;
      this.internals.matching = scope;
    }

    this.internals.mode = mode || 'vc';
    return Promise.resolve(executeSeed(this.internals, this.config)).asCallback(
      callback
    );
  },

  /**
   * Execute the down function of currently executed seeds.
   */
  undoSeed: function (specification, scope, callback) {
    var executeUndoSeed = load('undo-seed');
    if (arguments.length > 0) {
      if (typeof specification === 'number') {
        this.internals.argv.count = specification;

        if (scope) {
          this.internals.migrationMode = scope;
          this.internals.matching = scope;
        }
      } else if (typeof specification === 'string') {
        this.internals.migrationMode = scope;
        this.internals.matching = scope;
      }
    }

    return Promise.resolve(
      executeUndoSeed(this.internals, this.config)
    ).asCallback(callback);
  },

  /**
   * Execute the reset function of currently executed seeds.
   */
  resetSeed: function (specification, scope, callback) {
    var executeUndoSeed = load('undo-seed');
    if (arguments.length > 0) {
      if (typeof specification === 'number') {
        this.internals.argv.count = specification;

        if (scope) {
          this.internals.migrationMode = scope;
          this.internals.matching = scope;
        }
      } else if (typeof specification === 'string') {
        this.internals.migrationMode = scope;
        this.internals.matching = scope;
      }
    }

    this.internals.argv.count = Number.MAX_VALUE;
    return Promise.resolve(
      executeUndoSeed(this.internals, this.config)
    ).asCallback(callback);
  },

  /**
   * Executes the default routine.
   */
  run: function () {
    load('run')(this.internals, this.config);
  }
};

module.exports = dbmigrate;
