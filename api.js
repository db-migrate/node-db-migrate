var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var mkdirp = require('mkdirp');
var optimist = require('optimist');
var config = require('./lib/config.js');
var index = require('./connect');
var Migration = require('./lib/migration.js');
var Seeder = require('./lib/seeder.js');
var Migrator = require('./lib/migrator.js');
var log = require('./lib/log');
var pkginfo = require('pkginfo')(module, 'version');
var dotenv = require('dotenv');


//global declaration for detection like it's done in umigrate //deprecated
dbm = require('./'); //deprecated
async = require('async'); //deprecated

var internals = {};

function dbmigrate(isModule, options, callback) {

  this.internals = {

    onComplete: internals.onComplete
  };
  internals = this.internals;

  if (typeof(callback) === 'function')
    this.internals.onComplete = callback;
  else if (typeof(options) === 'function')
    this.internals.onComplete = options;

  this.dataType = dbm.dataType;
  this.version = dbm.version;
  dotenv.load({
    silent: true
  });
  registerEvents();


  if (typeof(options) === 'object') {

    if (typeof(options.config) === 'string')
      internals.configFile = options.string;

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

  loadConfig();
  index.exportInternals(internals);
  internals.dbm = dbm;
  global.dbm = dbm; //deprecated
  internals.migrationOptions = {
    dbmigrate: internals.dbm,
    ignoreOnInit: internals['argv']['ignore-on-init']
  };
  internals.seederOptions = {
    dbmigrate: internals.dbm
  };
}

function registerEvents() {

  process.on('uncaughtException', function(err) {
    log.error(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', function(reason, promise) {
    log.error(reason.stack);
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

  _internals: internals,

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
  up: function(specification, scope, callback) {

    if (arguments.length > 0) {
      if (typeof(specification) === 'string') {

        this.internals.argv.destination = specification;
      } else if (typeof(specification) === 'number') {

        this.internals.argv.count = specification;
      }

      if (scope) {

        this.internals.migrationMode = scope;
      }
    }

    executeUp(this.internals, callback);
  },

  /**
   * Executes up a given number of migrations or a specific one.
   *
   * Defaults to up all migrations if no count is given.
   */
  down: function(specification, scope, callback) {

    if (arguments.length > 0) {
      if (typeof(arguments[0]) === 'number') {

        this.internals.argv.count = arguments[0];
      }

      if (scope) {

        this.internals.migrationMode = scope;
      }
    }

    executeDown(this.internals, callback);
  },

  /**
   * Executes down for all currently migrated migrations.
   */
  reset: function(scope, callback) {

    if (scope) {

      this.internals.migrationMode = scope;
    }

    this.internals.argv.count = Number.MAX_VALUE;
    executeDown(this.internals, callback);
  },

  /**
   * Silence the log output completely.
   */
  silence: function(isSilent) {

    return log.silence(isSilent);
  },

  /**
   * Creates a correctly formatted migration
   */
  create: function(migrationName, scope, callback) {

    if (typeof(scope) === 'function') {

      callback = scope;
    } else if (scope) {

      this.internals.migrationMode = scope;
    }

    this.internals.argv._.push(migrationName);
    executeCreateMigration(this.internals, callback);
  },

  /**
   * Creates a database of the given dbname.
   */
  createDatabase: function(dbname, callback) {

    this.internals.argv._.push(dbname);
    this.internals.mode = 'create';
    executeDB(this.internals, callback);
  },

  /**
   * Drops a database of the given dbname.
   */
  dropDatabase: function(dbname, callback) {

    this.internals.argv._.push(dbname);
    this.internals.mode = 'drop';
    executeDB(this.internals, callback);
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
    }

    this.internals.mode = mode || 'vc';
    executeSeed(this.internals, callback);
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
        }
      } else if (typeof(specification) === 'string') {

        this.internals.migrationMode = scope;
      }
    }
  },

  /**
   * Executes the default routine.
   */
  run: function() {

    run(this.internals);

  }

};

function setDefaultArgv(internals, isModule) {

  internals.argv = optimist
    .default({
      verbose: false,
      table: 'migrations',
      'seeds-table': 'seeds',
      'force-exit': false,
      'sql-file': false,
      'non-transactional': false,
      config: internals.configFile || internals.cwd + '/database.json',
      'migrations-dir': internals.cwd + '/migrations',
      'vcseeder-dir': internals.cwd + '/VCSeeder',
      'staticseeder-dir': internals.cwd + '/Seeder',
      'ignore-completed-migrations': false
    })
    .usage(
      'Usage: db-migrate [up|down|reset|create|db|seed] [[dbname/]migrationName|all] [options]'
    )

  .describe('env',
      'The environment to run the migrations under (dev, test, prod).')
    .alias('e', 'env')
    .string('e')

  .describe('migrations-dir', 'The directory containing your migration files.')
    .alias('m', 'migrations-dir')
    .string('m')

  .describe('count', 'Max number of migrations to run.')
    .alias('c', 'count')
    .string('c')

  .describe('dry-run', 'Prints the SQL but doesn\'t run it.')
    .boolean('dry-run')

  .describe('force-exit', 'Forcibly exit the migration process on completion.')
    .boolean('force-exit')

  .describe('verbose', 'Verbose mode.')
    .alias('v', 'verbose')
    .boolean('v')

  .alias('h', 'help')
    .alias('h', '?')
    .boolean('h')

  .describe('version', 'Print version info.')
    .alias('i', 'version')
    .boolean('version')

  .describe('config', 'Location of the database.json file.')
    .string('config')

  .describe('sql-file',
      'Automatically create two sql files for up and down statements in /sqls and generate the javascript code that loads them.'
    )
    .boolean('sql-file')

  .describe('coffee-file', 'Create a coffeescript migration file')
    .boolean('coffee-file')
    .describe('ignore-on-init',
      'Create files that will run only if ignore-on-init in the env is set to false (currently works onlt with SQL)'
    ).boolean('ignore-on-init')

  .describe('migration-table',
      'Set the name of the migration table, which stores the migration history.'
    )
    .alias('table', 'migration-table')
    .alias('t', 'table')
    .string('t')

  .describe('seeds-table',
      'Set the name of the seeds table, which stores the seed history.')
    .string('seeds-table')

  .describe('vcseeder-dir',
      'Set the path to the Version Controlled Seeder directory.')
    .string('vcseeder-dir')

  .describe('staticseeder-dir', 'Set the path to the Seeder directory.')
    .string('staticseeder-dir')

  .describe('non-transactional', 'Explicitly disable transactions')
    .boolean('non-transactional')

  .describe('ignore-completed-migrations', 'Start at the first migration')
    .boolean('ignore-completed-migrations')

  .describe('log-level', 'Set the log-level, for example sql|warn')
    .string('log-level')

  .argv;

  if (internals.argv.version) {
    console.log(dbm.version);
    process.exit(0);
  }

  if (!isModule && (internals.argv.help || internals.argv._.length === 0)) {
    optimist.showHelp();
    process.exit(1);
  }

  if (internals.argv['log-level']) {

    log.setLogLevel(internals.argv['log-level']);
  }

  internals.ignoreCompleted = internals.argv['ignore-completed-migrations'];
  internals.migrationTable = internals.argv.table;
  internals.seedTable = internals.argv['seeds-table'];
  internals.matching = '';
  internals.verbose = internals.argv.verbose;
  global.verbose = internals.verbose;
  internals.notransactions = internals.argv['non-transactional'];
  internals.dryRun = internals.argv['dry-run'];
  global.dryRun = internals.dryRun;

  if (internals.dryRun) {
    log.info('dry run');
  }

}

function createMigrationDir(dir, callback) {
  fs.stat(dir, function(err, stat) {
    if (err) {
      mkdirp(dir, callback);
    } else {
      callback();
    }
  });
}

function loadConfig() {
  if (process.env.DATABASE_URL) {
    config.loadUrl(process.env.DATABASE_URL, internals.argv.env);
  } else {
    config.load(internals.argv.config, internals.argv.env);
  }
  if (internals.verbose) {
    var current = config.getCurrent();
    var s = JSON.parse(JSON.stringify(current.settings));

    if (s.password)
      s.password = '******';

    log.info('Using', current.env, 'settings:', s);
  }
}

function executeCreateMigration(internals, callback) {
  var migrationsDir = internals.argv['migrations-dir'];

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
    if (shouldCreateSqlFiles() && shouldCreateCoffeeFile()) {
      templateType = Migration.TemplateType.COFFEE_SQL_FILE_LOADER;
    } else if (shouldCreateSqlFiles() && shouldIgnoreOnInitFiles()) {
      templateType = Migration.TemplateType.SQL_FILE_LOADER_IGNORE_ON_INIT;
    } else if (shouldCreateSqlFiles()) {
      templateType = Migration.TemplateType.SQL_FILE_LOADER;
    } else if (shouldCreateCoffeeFile()) {
      templateType = Migration.TemplateType.DEFAULT_COFFEE;
    }
    var migration = new Migration(internals.argv.title + (
        shouldCreateCoffeeFile() ? '.coffee' : '.js'), path, new Date(),
      templateType);
    index.createMigration(migration, function(err, migration) {
      if (_assert(err, callback)) {

        log.info(util.format('Created migration at %s', migration.path));
      }
    });
  });

  if (shouldCreateSqlFiles(internals)) {
    createSqlFiles(internals, callback);
  } else {
    if (typeof(callback) === 'function') {

      callback();
    }
  }
}

function shouldCreateSqlFiles() {
  return internals.argv['sql-file'] || config['sql-file'];
}

function shouldIgnoreOnInitFiles() {
  return internals.argv['ignore-on-init'] || config[
    'ignore-on-init'];
}

function shouldCreateCoffeeFile() {
  return internals.argv['coffee-file'] || config['coffee-file'];
}

function createSqlFiles(internals, callback) {
  var migrationsDir = internals.argv['migrations-dir'];

  if (internals.migrationMode && internals.migrationMode !== 'all') {

    migrationsDir = internals.argv['migrations-dir'] + '/' +
      internals.migrationMode;
  }

  var sqlDir = migrationsDir + '/sqls';
  createMigrationDir(sqlDir, function(err) {
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
      sqlDir, new Date(), templateTypeDefaultSQL);
    index.createMigration(migrationUpSQL, function(err, migration) {
      if (_assert(err, callback)) {

        log.info(util.format('Created migration up sql file at %s',
          migration.path));

        var migrationDownSQL = new Migration(internals.argv.title +
          '-down.sql', sqlDir, new Date(), templateTypeDefaultSQL);
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

function executeUp(internals, callback) {

  if (!internals.argv.count) {
    internals.argv.count = Number.MAX_VALUE;
  }

  index.connect({
    config: config.getCurrent().settings,
    internals: internals
  }, Migrator, function(err, migrator) {
    assert.ifError(err);

    if (internals.locTitle)
      migrator.migrationsDir = path.resolve(internals.argv['migrations-dir'],
        internals.locTitle);
    else
      migrator.migrationsDir = path.resolve(internals.argv['migrations-dir']);

    internals.migrationsDir = migrator.migrationsDir;

    migrator.driver.createMigrationsTable(function(err) {
      assert.ifError(err);
      log.verbose('migration table created');
      migrator.up(internals.argv, internals.onComplete.bind(this,
        migrator, callback));
    });
  });
}

function executeDown(internals, callback) {

  if (!internals.argv.count) {
    log.info('Defaulting to running 1 down migration.');
    internals.argv.count = 1;
  }

  index.connect({
    config: config.getCurrent().settings,
    internals: internals
  }, Migrator, function(err, migrator) {
    assert.ifError(err);

    migrator.migrationsDir = path.resolve(internals.argv['migrations-dir']);

    migrator.driver.createMigrationsTable(function(err) {
      assert.ifError(err);
      migrator.down(internals.argv, internals.onComplete.bind(this,
        migrator, callback));
    });
  });
}

function executeDB(internals, callback) {

  if (internals.argv._.length > 0) {
    internals.argv.dbname = internals.argv._.shift().toString();
  } else {

    log.info('Error: You must enter a database name!');
    return;
  }

  index.driver(config.getCurrent().settings, function(err, db) {
    if (internals.mode === 'create') {
      db.createDatabase(internals.argv.dbname, {
        ifNotExists: true
      }, function() {
        if (err) {
          log.info('Error: Failed to create database!');
        } else {
          log.info('Created database "' + internals.argv.dbname + '"');
        }

        db.close();
        callback();
      });
    } else if (internals.mode === 'drop') {
      db.dropDatabase(internals.argv.dbname, {
        ifExists: true
      }, function() {
        if (err) {
          log.info('Error: Failed to drop database!');
        } else {
          log.info('Deleted database "' + internals.argv.dbname + '"');
        }

        db.close();
        callback();
      });
    } else
      return;
  });

}

function executeSeed(internals, callback) {

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
        callback));
    } else {
      seeder.createSeedsTable(function(err) {
        if (_assert(err, callback)) {

          seeder.seed(internals.argv, internals.onComplete.bind(this,
            seeder, callback));
        }
      });
    }
  });
}

internals.onComplete = onComplete;

function onComplete(migrator, callback, originalErr) {

  if (typeof(callback) !== 'function') {
    originalErr = originalErr || callback;
  }

  migrator.driver.close(function(err) {
    if ((err || originalErr) && typeof(callback) === 'function') {

      callback({
        err: err,
        originalErr: originalErr
      });
      return;
    } else {

      assert.ifError(originalErr);
      assert.ifError(err);
      log.info('Done');
    }

    if (internals.argv['force-exit']) {
      log.verbose('Forcing exit');
      process.exit(0);
    }

    if (typeof(callback) === 'function') {
      callback();
    }
  });
}

function run(internals) {
  var action = internals.argv._.shift(),
    folder = action.split(':');

  action = folder[0];

  switch (action) {
    case 'create':

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }
      executeCreateMigration(internals);
      break;
    case 'up':
    case 'down':
    case 'reset':

      if (action === 'reset')
        internals.argv.count = Number.MAX_VALUE;

      if (internals.argv._.length > 0) {
        if (action === 'down') {
          log.info(
            'Ignoring migration name for down migrations.  Use --count to control how many down migrations are run.'
          );
          internals.argv.destination = null;
        } else {
          internals.argv.destination = internals.argv._.shift().toString();
        }
      }

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }

      if (action == 'up') {
        executeUp(internals);
      } else {
        executeDown(internals);
      }
      break;

    case 'db':

      if (folder.length < 1) {

        log.info('Please enter a valid command, i.e. db:create|db:drop');
      } else {

        internals.mode = folder[1];
        executeDB(internals);
      }
      break;
    case 'seed':

      internals.mode = folder[1] || 'vc';
      internals.migrationMode = folder[2];

      if (internals.argv._[0] === 'down') {

        internals.argv._.shift();
      } else {

        executeSeed(internals);
      }
      break;

    default:
      log.error('Invalid Action: Must be [up|down|create|reset|seed|db].');
      optimist.showHelp();
      process.exit(1);
      break;
  }
}


module.exports = dbmigrate;
