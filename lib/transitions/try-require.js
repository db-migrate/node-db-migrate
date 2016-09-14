var log = require('db-migrate-shared').log;
var fs = require('fs');

var handled = false;
var removedGlobals = {
  'dbm is not defined': globalHandler,
  'async is not defined': globalHandler
};

function globalHandler(migration, retry) {

  var data = fs.readFileSync(migration, 'utf8');
  data = data.replace(
    /^dbm = dbm \|\| require\(\s+'db-migrate'\s+\)/m,
    'var dbm'
  );
  data = data.replace(
    /^async = async \|\| require\(\s+'async'\s+\)/m,
    'var async = require( \'async\' )'
  );
  data = data.replace(
    /^var type = dbm.dataType/m,
    'var type'
  );

  if(data.indexOf('exports.setup = ') === -1) {

    var snippet = fs.readFileSync(__dirname + '/snippets/setup.sjs', 'utf8');
    data = data.replace(/exports.up/, snippet + '\nexports.up');
  }

  fs.writeFileSync(migration, data, 'utf8');

  return retry();
}

function tryRequire(migration) {

  try {

    if(handled) {

      //require(migration.internals.cwd + 'package.json')
      //cp npm install --save async
    }

    return require(migration.internals.cwd + '/' + migration.path);
  }
  catch(ex) {
    if(ex instanceof ReferenceError) {

      if(removedGlobals[ex.message]) {

        handled = true;
        log.info(ex.message, 'Initiating removal of old globals...');
        return removedGlobals[ex.message](
          migration.path,
          tryRequire.bind(this, migration)
        );
      }
      else {

        log.error(
          ex.stack,
          'Unknown failure, please check your file',
          migration
        );

        throw new Error('Unhandled ReferenceError while transition. Please ' +
          'fix the issues and rerun the transitioner again.');
      }
    }
    else {

      log.error(ex.stack, migration);
      throw new Error('Unhandled Error while transition. Please ' +
        'fix the issues and rerun the transitioner again.');
    }
  }
}

module.exports = tryRequire;
