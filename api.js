var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var mkdirp = require('mkdirp');
var optimist = require('optimist');
var log = require('db-migrate-shared').log;
var pkginfo = require('pkginfo')(module, 'version'); // jshint ignore:line
var dotenv = require('dotenv');
var Promise = Promise;
var onComplete = require('./lib/commands/on-complete.js');

function registerPluginLoader(plugins) {

  return {

    overwrite: function(name) {

      if(plugins[name] && plugins[name].length) {

        var plugin = plugins[name];

        if(plugin.length !== 1) {
          log.warn(
            'Attention, multiple overwrites registered for %s, we are ' +
            'only loading the first plugin %s!',
            name,
            plugin.name
          );
        }

        plugin = plugin[0];
        if(typeof(plugin.loadPlugin) === 'function')
          plugin.loadPlugin();

        return plugin;
      }

      return false;
    },

    hook: function(name) {

      if(plugins[name] && plugins[name].length) {

        var plugin = plugins[name];

        plugin.map(function(plugin) {

          if(typeof(plugin.loadPlugin) === 'function')
            plugin.loadPlugin();
        });

        return plugin;
      }

      return false;
    }
  };
}

var APIHooks = {
  'init:api:addfunction:hook': function(name, fn) {

    this[name] = fn;
    return;
  },
  'init:api:accessapi:hook': function(cb) {

    return cb(this);
  }
};

function dbmigrate(plugins, isModule, options, callback) {

  var setDefaultArgv = require('./lib/commands/set-default-argv.js');

  this.internals = {

    onComplete: onComplete,
    migrationProtocol: 1
  };
  var internals = this.internals;

  this.internals.plugins = registerPluginLoader(plugins);

  if (typeof(callback) === 'function')
    this.internals.onComplete = callback;
  else if (typeof(options) === 'function')
    this.internals.onComplete = options;

  this.internals.dbm = require('./');
  this.dataType = this.internals.dbm.dataType;
  this.version = this.internals.dbm.version;
  dotenv.load({
    silent: true
  });

  /* $lab:coverage:off$ */
  if(options && !options.throwUncatched)
    registerEvents();
  /* $lab:coverage:on$ */

  if (typeof(options) === 'object') {

    if (typeof(options.config) === 'string')
      internals.configFile = options.config;
    else if (typeof(options.config) === 'object')
      internals.configObject = options.config;

    if (typeof(options.env) === 'string')
      internals.currentEnv = options.env;

    if (typeof(options.cwd) === 'string')
      internals.cwd = options.cwd;
    else
      internals.cwd = process.cwd();
  } else
    internals.cwd = process.cwd();

  if (typeof(isModule) === 'function') {
    this.internals.onComplete = isModule;
    setDefaultArgv(this.internals);
  } else
    setDefaultArgv(this.internals, isModule);

  this.config = loadConfig( require('./lib/config.js'), this.internals );

  //delayed loading of bluebird
  Promise = require('bluebird');
  this.internals.migrationOptions = {
    dbmigrate: this.internals.dbm,
    ignoreOnInit: this.internals.argv['ignore-on-init'],
    Promise: Promise
  };
  this.internals.seederOptions = {
    dbmigrate: this.internals.dbm,
    Promise: Promise
  };
}

function registerEvents() {

  process.on('uncaughtException', function(err) {
    log.error(err.stack || err);
    process.exit(1);
  });

  process.on('unhandledRejection', function(reason) {
    log.error(reason.stack || reason);
    process.exit(1);
  });
}

dbmigrate.prototype = {

  /**
   * Add a global defined variable to db-migrate, to enable access from
   * local migrations without configuring pathes.
   *
   * @return boolean
   */
  addGlobal: function(library) {

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
  registerAPIHook: function(callback) {

    var plugins = this.internals.plugins;
    var self = this;

    return Promise.resolve(Object.keys(APIHooks))
    .each(function(hook) {

      var plugin = plugins.hook(hook);
      if(!plugin) return;

      var APIHook = APIHooks[hook].bind(self);

      return Promise.resolve(plugin)
      .map(function(plugin) {

        return plugin[hook]();
      })
      .each(function(args) {

        return APIHook.apply(self, args);
      });
    }).asCallback(callback);
  },

  _internals: this.internals,

  /**
   * Add a configuration option to dbmigrate.
   *
   * @return boolean
   */
  addConfiguration: function(description, args, type) {

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
  resetConfiguration: function(argv) {
    this.internals.argv = argv;
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  up: function(specification, opts, callback) {

    var executeUp = require('./lib/commands/up.js');

    if (arguments.length > 0) {
      if (typeof(specification) === 'string') {

        this.internals.argv.destination = specification;
      } else if (typeof(specification) === 'number') {

        this.internals.argv.count = specification;
      }
      else if (typeof(specification) === 'function') {

        callback = specification;
      }

      if (typeof(opts) === 'string') {

        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      }
      else if (typeof(opts) === 'function') {

        callback = opts;
      }
    }

    return Promise.fromCallback(function(callback) {

      executeUp(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  down: function(specification, opts, callback) {

    var executeDown = require('./lib/commands/down.js');

    if (arguments.length > 0) {
      if (typeof(specification) === 'number') {

        this.internals.argv.count = arguments[0];
      }
      else if (typeof(specification) === 'function') {

        callback = specification;
      }

      if (typeof(opts) === 'string') {

        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      }
      else if (typeof(opts) === 'function') {

        callback = opts;
      }
    }

    return Promise.fromCallback(function(callback) {

      executeDown(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  sync: function(specification, opts, callback) {

    var executeSync = require('./lib/commands/sync.js');

    if (arguments.length > 0) {
      if (typeof(specification) === 'string') {

        this.internals.argv.destination = specification;
      }

      if (typeof(opts) === 'string') {

        this.internals.migrationMode = opts;
        this.internals.matching = opts;
      }
      else if (typeof(opts) === 'function') {

        callback = opts;
      }
    }

    return Promise.fromCallback(function(callback) {

      executeSync(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Executes down for all currently migrated migrations.
   */
  reset: function(scope, callback) {

    var executeDown = require('./lib/commands/down.js');

    if (typeof(scope) === 'string') {

      this.internals.migrationMode = scope;
      this.internals.matching = scope;
    }
    else if(typeof(scope) === 'function') {

      callback = scope;
    }

    this.internals.argv.count = Number.MAX_VALUE;
    return Promise.fromCallback(function(callback) {

      executeDown(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Silence the log output completely.
   */
  silence: function(isSilent) {

    return log.silence(isSilent);
  },

  /**
    * Transition migrations to the latest defined protocol.
    */
  transition: function() {

    transition(this.internals);
  },

  /**
   * Creates a correctly formatted migration
   */
  create: function(migrationName, scope, callback) {

    if (typeof(scope) === 'function') {

      callback = scope;
    } else if (scope) {

      this.internals.migrationMode = scope;
      this.internals.matching = scope;
    }

    this.internals.argv._.push(migrationName);
    return Promise.fromCallback(function(callback) {

      executeCreateMigration(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Creates a database of the given dbname.
   */
  createDatabase: function(dbname, callback) {

    this.internals.argv._.push(dbname);
    this.internals.mode = 'create';
    return Promise.fromCallback(function(callback) {

      executeDB(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Drops a database of the given dbname.
   */
  dropDatabase: function(dbname, callback) {

    this.internals.argv._.push(dbname);
    this.internals.mode = 'drop';
    return Promise.fromCallback(function(callback) {

      executeDB(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Sets a config variable to the given value.
   *
   * @return value
   */
  setConfigParam: function(param, value) {

    return (this.internals.argv[param] = value);
  },


  /**
   * Sets the callback to the default onComplete
   */
  setDefaultCallback: function() {

    this.internals.onComplete = onComplete;
  },

  /**
   * Let's the user customize the callback, which gets called after all
   * migrations have been done.
   */
  setCustomCallback: function(callback) {

    this.internals.onComplete = callback;
  },

  /**
   * Seeds either the static or version controlled seeders, controlled by
   * the passed mode.
   */
  seed: function(mode, scope, callback) {

    if (scope) {

      this.internals.migrationMode = scope;
      this.internals.matching = scope;
    }

    this.internals.mode = mode || 'vc';
    return Promise.fromCallback(function(callback) {

      executeSeed(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Execute the down function of currently executed seeds.
   */
  undoSeed: function(specification, scope, callback) {

    if (arguments.length > 0) {
      if (typeof(specification) === 'number') {

        this.internals.argv.count = specification;

        if (scope) {

          this.internals.migrationMode = scope;
          this.internals.matching = scope;
        }
      } else if (typeof(specification) === 'string') {

        this.internals.migrationMode = scope;
        this.internals.matching = scope;
      }
    }

    return Promise.fromCallback(function(callback) {

      executeUndoSeed(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Execute the reset function of currently executed seeds.
   */
  resetSeed: function(specification, scope, callback) {

    if (arguments.length > 0) {
      if (typeof(specification) === 'number') {

        this.internals.argv.count = specification;

        if (scope) {

          this.internals.migrationMode = scope;
          this.internals.matching = scope;
        }
      } else if (typeof(specification) === 'string') {

        this.internals.migrationMode = scope;
        this.internals.matching = scope;
      }
    }

    this.internals.argv.count = Number.MAX_VALUE;
    return Promise.fromCallback(function(callback) {

      executeUndoSeed(this.internals, this.config, callback);
    }.bind(this)).asCallback(callback);
  },

  /**
   * Executes the default routine.
   */
  run: function() {

    run(this.internals, this.config);

  }

};

function createMigrationDir(dir, callback) {
  fs.stat(dir, function(err) {
    if (err) {
      mkdirp(dir, callback);
    } else {
      callback();
    }
  });
}

function loadConfig( config, internals ) {
  var out,
      currentEnv = internals.currentEnv || internals.argv.env;

  if (internals.configObject) {
    out = config.loadObject(internals.configObject, currentEnv);
  } else {
    out = config.loadFile(internals.argv.config, currentEnv, internals.plugins);
  }
  if (internals.verbose) {
    var current = out.getCurrent();
    var s = JSON.parse(JSON.stringify(current.settings));

    if (s.password)
      s.password = '******';

    log.info('Using', current.env, 'settings:', s);
  }

  return out;
}

function executeCreateMigration(internals, config, callback) {

  var migrationsDir = internals.argv['migrations-dir'];

  internals.runTimestamp = new Date();

  if (internals.migrationMode && internals.migrationMode !== 'all') {

    migrationsDir = internals.argv['migrations-dir'] + '/' +
      internals.migrationMode;
  }

  var folder, path;

  if (internals.argv._.length === 0) {
    log.error('\'migrationName\' is required.');
    optimist.showHelp();
    process.exit(1);
  }

  createMigrationDir(migrationsDir, function(err) {

    var index = require('./connect');
    var Migration = require('./lib/migration.js');

    if (err) {
      log.error('Failed to create migration directory at ', migrationsDir,
        err);
      process.exit(1);
    }

    internals.argv.title = internals.argv._.shift();
    folder = internals.argv.title.split('/');

    internals.argv.title = folder[folder.length - 2] || folder[0];
    path = migrationsDir;

    if (folder.length > 1) {

      path += '/';

      for (var i = 0; i < folder.length - 1; ++i) {

        path += folder[i] + '/';
      }
    }

    var templateType = Migration.TemplateType.DEFAULT_JS;
    if (shouldCreateSqlFiles( internals, config ) &&
        shouldCreateCoffeeFile( internals, config )) {

      templateType = Migration.TemplateType.COFFEE_SQL_FILE_LOADER;
    } else if (shouldCreateSqlFiles( internals, config ) &&
               shouldIgnoreOnInitFiles( internals, config )) {

      templateType = Migration.TemplateType.SQL_FILE_LOADER_IGNORE_ON_INIT;
    } else if (shouldCreateSqlFiles( internals, config )) {

      templateType = Migration.TemplateType.SQL_FILE_LOADER;
    } else if (shouldCreateCoffeeFile( internals, config )) {

      templateType = Migration.TemplateType.DEFAULT_COFFEE;
    }
    var migration = new Migration(internals.argv.title + (
        shouldCreateCoffeeFile( internals, config ) ? '.coffee' : '.js'), path, internals.runTimestamp,
      templateType);
    index.createMigration(migration, function(err, migration) {
      if (_assert(err, callback)) {

        log.info(util.format('Created migration at %s', migration.path));
        if (shouldCreateSqlFiles(internals, config)) {
          createSqlFiles(internals, config, callback);
        } else {
          if (typeof(callback) === 'function') {
            callback();
          }
        }
      }
    });
  });
}

function shouldCreateSqlFiles( internals, config ) {
  return internals.argv['sql-file'] || config['sql-file'];
}

function shouldIgnoreOnInitFiles( internals, config ) {
  return internals.argv['ignore-on-init'] || config[
    'ignore-on-init'];
}

function shouldCreateCoffeeFile( internals, config ) {
  return internals.argv['coffee-file'] || config['coffee-file'];
}

function createSqlFiles(internals, config, callback) {

  var migrationsDir = internals.argv['migrations-dir'];

  if (internals.migrationMode && internals.migrationMode !== 'all') {

    migrationsDir = internals.argv['migrations-dir'] + '/' +
      internals.migrationMode;
  }

  var sqlDir = migrationsDir + '/sqls';
  createMigrationDir(sqlDir, function(err) {

    var index = require('./connect');
    var Migration = require('./lib/migration.js');

    if (err) {
      log.error('Failed to create migration directory at ', sqlDir, err);

      if (typeof(callback) !== 'function') {

        process.exit(1);
      } else {

        return callback(err);
      }
    }

    var templateTypeDefaultSQL = Migration.TemplateType.DEFAULT_SQL;
    var migrationUpSQL = new Migration(internals.argv.title + '-up.sql',
      sqlDir, internals.runTimestamp, templateTypeDefaultSQL);
    index.createMigration(migrationUpSQL, function(err, migration) {
      if (_assert(err, callback)) {

        log.info(util.format('Created migration up sql file at %s',
          migration.path));

        var migrationDownSQL = new Migration(internals.argv.title +
          '-down.sql', sqlDir, internals.runTimestamp, templateTypeDefaultSQL);
        index.createMigration(migrationDownSQL, function(err, migration) {
          if (_assert(err, callback)) {

            log.info(util.format(
              'Created migration down sql file at %s',
              migration.path));
            if (typeof(callback) === 'function')
              callback();
          }
        });
      }
    });
  });
}

function _assert(err, callback) {
  if (err) {

    if (typeof(callback) === 'function') {

      callback(err);
      return false;
    } else {

      assert.ifError(err);
      return false;
    }
  }

  return true;
}

function migrationHook(internals) {

  var Migration = require('./lib/migration.js');
  return Migration.registerHook(internals.plugins, internals);
}

function executeDB(internals, config, callback) {

  var index = require('./connect');
  var settings = config.getCurrent().settings;
  internals.argv.dbname = settings.database;
  delete settings.database;

  if (internals.argv.dbname === undefined) {
    log.info('Error: You must set a database name!');
    return;
  }

  index.driver(settings, function(err, db) {
    assert.ifError(err);

    if (internals.mode === 'create') {
      db.createDatabase(internals.argv.dbname, {
        ifNotExists: true
      }, function(err) {
        if (err) {
          if( err.error )
            err = err.error;
          log.info('Error: Failed to create database!', err);
        } else {
          log.info('Created database "' + internals.argv.dbname + '"');
        }

        db.close();
        if( typeof(callback) === 'function' )
          callback();
      });
    } else if (internals.mode === 'drop') {
      db.dropDatabase(internals.argv.dbname, {
        ifExists: true
      }, function(err) {
        if (err) {
          if( err.error )
            err = err.error;
          log.info('Error: Failed to drop database!', err);
        } else {
          log.info('Deleted database "' + internals.argv.dbname + '"');
        }

        db.close();
        if( typeof(callback) === 'function' )
          callback();
      });
    } else
      return;
  });

}

function executeSeed(internals, config, callback) {

  var index = require('./connect');
  var Seeder = require('./lib/seeder.js');

  if (internals.argv._.length > 0) {
    internals.argv.destination = internals.argv._.shift().toString();
  }

  index.connect({
    config: config.getCurrent().settings,
    internals: internals
  }, Seeder, function(err, seeder) {
    assert.ifError(err);

    seeder.seedDir = path.resolve(internals.argv[(internals.mode !==
      'static') ? 'vcseeder-dir' : 'staticseeder-dir']);

    if (internals.mode === 'static') {

      seeder.seed(internals.argv, internals.onComplete.bind(this, seeder,
        internals, callback));
    } else {
      seeder.createSeedsTable(function(err) {
        if (_assert(err, callback)) {

          seeder.seed(internals.argv, internals.onComplete.bind(this,
            seeder, internals, callback));
        }
      });
    }
  });
}

function executeUndoSeed(internals, config, callback) {

  var index = require('./connect');
  var Seeder = require('./lib/seeder.js');

  if (!internals.argv.count) {
    log.info('Defaulting to running 1 down seed.');
    internals.argv.count = 1;
  }

  if (internals.argv._.length > 0) {
    internals.argv.destination = internals.argv._.shift().toString();
  }

  index.connect({
    config: config.getCurrent().settings,
    internals: internals
  }, Seeder, function(err, seeder) {
    assert.ifError(err);

    seeder.seedDir = path.resolve(internals.argv[(internals.mode !==
      'static') ? 'vcseeder-dir' : 'staticseeder-dir']);

    if (internals.mode === 'static') {

      internals.onComplete( seeder, callback,
        { stack: 'Static seeders can\'t be undone. Use VC Seeders instead!' } );
    } else {
      seeder.createSeedsTable(function(err) {
        if (_assert(err, callback)) {

          seeder.down(internals.argv, internals.onComplete.bind(this,
            seeder, internals, callback));
        }
      });
    }
  });
}

function transition(internals) {

  require('./lib/transitions/transitioner.js')(internals);
}

function run(internals, config) {
  var action = internals.argv._.shift(),
    folder = action.split(':');

  action = folder[0];

  switch (action) {
    case 'transition':

      transition(internals);
      break;
    case 'create':

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }
      executeCreateMigration(internals, config);
      break;
    case 'sync':

      var executeSync = require('./lib/commands/sync.js');

      if (internals.argv._.length === 0) {

        log.error('Missing sync destination!');
        process.exit(1);
      }

      internals.argv.count = Number.MAX_VALUE;
      internals.argv.destination = internals.argv._.shift().toString();

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }

      executeSync(internals, config);
      break;
    case 'up':
    case 'down':
    case 'reset':

      if (action === 'reset')
        internals.argv.count = Number.MAX_VALUE;

      if (internals.argv._.length > 0) {
        if (action === 'down') {

          internals.argv.count = internals.argv.count || Number.MAX_VALUE;
          internals.argv.destination = internals.argv._.shift().toString();
        } else {
          internals.argv.destination = internals.argv._.shift().toString();
        }
      }

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }

      if (action === 'up') {

        var executeUp = require('./lib/commands/up.js');
        executeUp(internals, config);
      } else {

        var executeDown = require('./lib/commands/down.js');
        executeDown(internals, config);
      }
      break;

    case 'db':

      if (folder.length < 1) {

        log.info('Please enter a valid command, i.e. db:create|db:drop');
      } else {

        internals.mode = folder[1];
        executeDB(internals, config);
      }
      break;
    case 'seed':

      internals.mode = folder[1] || 'vc';
      internals.migrationMode = folder[2];

      if (internals.argv._[0] === 'down' || internals.argv._[0] === 'reset') {

        if (internals.argv._[0] === 'reset')
          internals.argv.count = Number.MAX_VALUE;

        internals.argv._.shift();
        executeUndoSeed(internals, config);
      } else {

        executeSeed(internals, config);
      }
      break;

    default:
      var plugins = internals.plugins;
      var plugin = plugins.overwrite(
        'run:default:action:' + action + ':overwrite'
      );
      if(plugin) {

        plugin['run:default:action:' + action + ':overwrite']
          (internals, config);
      }
      else {

        log.error('Invalid Action: Must be [up|down|create|reset|sync|' +
          'db|transition].');
        optimist.showHelp();
        process.exit(1);
      }
      break;
  }
}


module.exports = dbmigrate;
