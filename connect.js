var recursive = require('final-fs').readdirRecursive;
var fs = require('fs');
var driver = require('./lib/driver');
var path = require('path');
var log = require('db-migrate-shared').log;

var internals = {};

exports.connect = function(config, passedClass, callback) {
  var internals = {};

  if( config.config ) {
    internals = config.internals;
    config = config.config;
  }

  driver.connect(config, internals, function(err, db) {
    if (err) { callback(err); return; }

    if(internals.migrationMode)
    {
      var dirPath = path.resolve(config['migrations-dir'] || 'migrations');

      if(internals.migrationMode !== 'all')
      {
        var switched = false,
            newConf;

        try {
          newConf = require(path.resolve(config['migrations-dir'] || 'migrations', internals.migrationMode) + '/config.json');
          log.info('loaded extra config for migration subfolder: "' + internals.migrationMode + '/config.json"');
          switched = true;
        } catch(e) {}

        if(switched) {

          db.switchDatabase(newConf, function()
          {
            internals.locTitle = internals.migrationMode;
            callback(null, new passedClass(db, config['migrations-dir'], internals.mode !== 'static', internals));
          });
        }
        else
        {
          internals.locTitle = internals.migrationMode;
          callback(null, new passedClass(db, config['migrations-dir'], internals.mode !== 'static', internals));
        }
      }
      else
      {
      recursive(dirPath, false, config['migrations-dir'] || 'migrations')
      .then(function(files) {
          var oldClose = db.close;

          files = files.filter(function (file) {
            return file !== 'migrations' && fs.statSync(file).isDirectory();
          });

          files.push('');

          db.close = function(cb) { migrationFiles(files, callback, config,
            internals, passedClass, db, oldClose, cb); };

          db.close();
        });
      }
    }
    else
      callback(null, new passedClass(db, config['migrations-dir'], internals.mode !== 'static', internals));

  });
};

exports.driver = function(config, callback) {

  var internals = {};
  var _config = config;
  if( config.config ) {
    internals = config.internals;
    config = config.config;
  }

  driver.connect(config, internals, callback);
};

function migrationFiles(files, callback, config, internals,
    passedClass, db, close, cb) {
  var file,
      switched = false,
      newConf;

  if(files.length === 1)
  {
    db.close = close;
  }

  file = files.pop();
  log.info( 'Enter scope "' + ((file !== '') ? file : '/') + '"' );

  if(file !== '')
  {
    try {
      fs.statSync(path.resolve(file + '/config.json'));
      newConf = require(path.resolve(file + '/config.json'));
      log.info('loaded extra config for migration subfolder: "' + file + '/config.json"');
      switched = true;
    } catch(e) {}
  }

  db.switchDatabase((switched) ? newConf : config.database, function()
  {
    internals.matching = file.substr(file.indexOf(config['migrations-dir'] || 'migrations') +
        (config['migrations-dir'] || 'migrations').length + 1);

    if(internals.matching.length === 0)
      internals.matching = '';


    internals.locTitle = internals.matching;
    callback(null, new passedClass(db, config['migrations-dir'], internals.mode !== 'static', internals));

    if(typeof(cb) === 'function')
      cb();

  });
}

exports.createMigration = function(migration, callback) {

  migration.write(function(err) {

    if (err) {

      callback(err);
      return;
    }

    callback(null, migration);
  });
};
