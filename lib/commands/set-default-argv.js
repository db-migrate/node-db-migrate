var yargs = require('yargs');
var log = require('db-migrate-shared').log;

module.exports = function (internals, isModule) {
  var rc = require('rc');
  var deepExtend = require('deep-extend');
  var defaultConfig = {
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
  };

  if (!isModule) {
    internals.argv = yargs
      .default(defaultConfig)
      .usage(
        'Usage: db-migrate [up|down|check|reset|sync|create|db|transition] ' +
          '[[dbname/]migrationName|all] [options]'
      )
      .describe(
        'env',
        'The environment to run the migrations under (dev, test, prod).'
      )
      .alias('e', 'env')
      .string('e')
      .describe(
        'migrations-dir',
        'The directory containing your migration files.'
      )
      .alias('m', 'migrations-dir')
      .string('m')
      .describe('count', 'Max number of migrations to run.')
      .alias('c', 'count')
      .string('c')
      .describe('dry-run', "Prints the SQL but doesn't run it.")
      .boolean('dry-run')
      .describe(
        'check',
        'Prints the migrations to be run without running them.'
      )
      .boolean('check')
      .describe(
        'force-exit',
        'Forcibly exit the migration process on completion.'
      )
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
      .describe(
        'sql-file',
        'Automatically create two sql files for up and down statements in ' +
          '/sqls and generate the javascript code that loads them.'
      )
      .boolean('sql-file')
      .describe('coffee-file', 'Create a coffeescript migration file')
      .boolean('coffee-file')
      .describe(
        'ignore-on-init',
        'Create files that will run only if ignore-on-init in the env is set ' +
          'to false (currently works only with SQL)'
      )
      .boolean('ignore-on-init')
      .describe(
        'migration-table',
        'Set the name of the migration table, which stores the migration history.'
      )
      .alias('table', 'migration-table')
      .alias('t', 'table')
      .string('t')
      .describe(
        'seeds-table',
        'Set the name of the seeds table, which stores the seed history.'
      )
      .string('seeds-table')
      .describe(
        'vcseeder-dir',
        'Set the path to the Version Controlled Seeder directory.'
      )
      .string('vcseeder-dir')
      .describe('staticseeder-dir', 'Set the path to the Seeder directory.')
      .string('staticseeder-dir')
      .describe('non-transactional', 'Explicitly disable transactions')
      .boolean('non-transactional')
      .describe('ignore-completed-migrations', 'Start at the first migration')
      .boolean('ignore-completed-migrations')
      .describe('log-level', 'Set the log-level, for example sql|warn')
      .string('log-level')
      .parse();
  } else {
    internals.argv = Object.assign(defaultConfig, internals.cmdOptions);
  }

  var plugins = internals.plugins;
  var plugin = plugins.hook('init:cli:config:hook');
  var _config = internals.argv.config;

  if (plugin) {
    plugin.forEach(function (plugin) {
      // var configs = plugin['init:cli:config:hook']();
      // if (!configs) return;
      // hook not yet used, we look into migrating away from yargs first
    });
  }

  internals.argv = deepExtend(internals.argv, rc('db-migrate', {}));
  internals.argv.rcconfig = internals.argv.config;
  internals.argv.config = internals.argv.configFile || _config;

  if (internals.argv.version) {
    console.log(internals.dbm.version);
    process.exit(0);
  }

  if (!isModule && (internals.argv.help || internals.argv._.length === 0)) {
    yargs.showHelp();
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
  internals.check = internals.argv.check;

  if (internals.dryRun) {
    log.info('dry run');
  }
  if (internals.check) {
    log.info('check');
  }
};
