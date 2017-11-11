var log = require('db-migrate-shared').log;
var path = require('path');
var fs = require('fs');
var cp = require('child_process');

var handled = false;
var installed = false;
var removedGlobals = {
  'dbm is not defined': globalHandler,
  'async is not defined': globalHandler,
  "Cannot find module 'db-migrate'": missingDBMigrate,
  "Cannot find module 'async'": installAsync
};

function missingDBMigrate (migration, retry) {
  return globalHandler(migration.path, retry);
}

function installAsync (migration, retry) {
  var cmd = ['install', '--save', 'async'];

  if (installed) {
    retry();
  } else {
    installed = true;
  }

  log.info('Installing async...');
  cp.spawnSync('npm', cmd, {
    cwd: migration.internals.cwd,
    stdio: 'inherit'
  });

  return retry();
}

function globalHandler (migration, retry) {
  var data = fs.readFileSync(migration, 'utf8');
  data = data.replace(
    /^dbm = dbm \|\| require\((?!\s)?'db-migrate'(?!\s)?\)/m,
    'var dbm'
  );

  data = data.replace(
    /^var dbm = global\.dbm \|\| require\((?!\s)?'db-migrate'(?!\s)?\)/m,
    'var dbm'
  );

  if (data.indexOf('async = async || require') !== -1) {
    handled = true;
    data = data.replace(
      /^async = async \|\| require\((?!\s)?'async'(?!\s)?\)/m,
      "var async = require( 'async' )"
    );
  }
  data = data.replace(/^var type = dbm.dataType/m, 'var type');

  if (data.indexOf('exports.setup = ') === -1) {
    var snippet = fs.readFileSync(
      path.join(__dirname, '/snippets/setup.sjs'),
      'utf8'
    );
    data = data.replace(/exports.up/, snippet + '\nexports.up');
  }

  fs.writeFileSync(migration, data, 'utf8');

  return retry();
}

function tryRequire (migration) {
  try {
    if (handled && !installed) {
      return installAsync(migration, tryRequire.bind(this, migration));
    }

    return require(migration.internals.cwd + '/' + migration.path);
  } catch (ex) {
    if (ex instanceof ReferenceError) {
      if (removedGlobals[ex.message]) {
        log.info(ex.message, 'Initiating removal of old globals...');
        return removedGlobals[ex.message](
          migration.path,
          tryRequire.bind(this, migration)
        );
      } else {
        log.error(
          ex.stack,
          'Unknown failure, please check your file',
          migration
        );

        throw new Error(
          'Unhandled ReferenceError while transition. Please ' +
            'fix the issues and rerun the transitioner again.'
        );
      }
    } else if (removedGlobals[ex.message]) {
      return removedGlobals[ex.message](
        migration,
        tryRequire.bind(this, migration)
      );
    } else {
      log.error(ex.stack, migration);
      throw new Error(
        'Unhandled Error while transition. Please ' +
          'fix the issues and rerun the transitioner again.'
      );
    }
  }
}

module.exports = tryRequire;
