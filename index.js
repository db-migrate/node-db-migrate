var recursive = require('final-fs').readdirRecursive;
var fs = require('fs');
var driver = require('./lib/driver');
var path = require('path');
var log = require('./lib/log');
var Migrator = require('./lib/migrator');

exports.dataType = require('./lib/data_type');
exports.config = require('./lib/config');

exports.connect = function(config, callback) {
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }

    if(global.migrationMode)
    {
      var dirPath = path.resolve(config['migrations-dir'] || 'migrations');

      if(global.migrationMode !== 'all')
      {
        var switched = false,
            newConf;

        try {
          newConf = require(path.resolve(config['migrations-dir'] || 'migrations', global.migrationMode) + '/config.json');
          log.info('loaded extra config for migration subfolder: "' + global.migrationMode + '/config.json"');
          switched = true;
        } catch(e) {}

        if(switched) {

          db.switchDatabase(newConf, function()
          {
            global.locTitle = global.migrationMode;
            callback(null, new Migrator(db, config['migrations-dir']));
          });
        }
        else
        {
          global.locTitle = global.migrationMode;
          callback(null, new Migrator(db, config['migrations-dir']));
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

          db.close = function(cb) { migrationFiles(files, callback, config, db, oldClose, cb); };

          db.close();
        });
      }
    }
    else
      callback(null, new Migrator(db, config['migrations-dir']));

  });
};

exports.driver = function(config, callback) {

  driver.connect(config, callback);
};

function migrationFiles(files, callback, config, db, close, cb) {
  var file,
      switched = false,
      newConf;

  if(files.length === 1)
  {
    db.close = close;
  }

  file = files.pop();

  if(file !== '')
  {

    try {
      newConf = require(path.resolve(file + '/config.json'));
      log.info('loaded extra config for migration subfolder: "' + file + '/config.json"');
      switched = true;
    } catch(e) {}
  }

  db.switchDatabase((switched) ? newConf : config.database, function()
  {
    global.matching = file.substr(file.indexOf(config['migrations-dir'] || 'migrations') +
        (config['migrations-dir'] || 'migrations').length + 1);

    if(global.matching.length === 0)
      global.matching = '';


    global.locTitle = global.matching;
    callback(null, new Migrator(db, config['migrations-dir']));

    if(typeof(cb) === 'function')
      cb();

  });
}

exports.createMigration = function(migration, callback) {
  migration.write(function(err) {
  if (err) { callback(err); return; }
  callback(null, migration);
  });
};
