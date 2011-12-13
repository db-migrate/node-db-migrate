var util = require('util');
var Migration = require('./migration');
var config = require('./config');
var fs = require('fs');
var path = require('path');

exports.create = function(options) {
  var migration = new Migration(options.title, new Date());
  migration.write(function(err) {
    if (err) {
      console.error('[FAILED]', err);
    } else {
      console.log('[SUCCESS]', util.format('Created migration at %s', migration.path));
    }
  });
};

exports.up = function(options) {
  var env = config.getCurrent();
  var driver = require('./driver/' + env.driver);
  driver.connect(env, function(err, db) {
    if (err) { console.error('[FAILED]', err); return; }
    db.createMigrationsTable(function(err) {
      if (err) { console.error('[FAILED]', err); return; }
      db.all('SELECT * FROM migrations ORDER BY name', function(err, dbResults) {
        if (err) { console.error('[FAILED]', err); return; }
        fs.readdir(options['migrations-dir'], function(err, files) {
          if (err) { console.error('[FAILED]', err); return; }
          files = files.sort();
          files = files.filter(function(file) {
            return /\.js$/.test(file);
          });
          files.forEach(function(file) {
            if (verbose) {
              console.log('processing file ' + file);
            }
            var migration = new Migration(path.join(options['migrations-dir'], file));
            var hasRun = dbResults.some(function(result) {
              return result.name === migration.name;
            });
            if (!hasRun) {
              migration.up(db, function(err) {
                if (err) { console.error('[FAILED]', err); return; }
              });
            }
          });
        });
      });
    });
  });
};

exports.down = function(options) {
  var env = config.getCurrent();
  var driver = require('./driver/' + env.driver);
  driver.connect(env, function(err, db) {
    if (err) { console.error('[FAILED]', err); return; }
    db.createMigrationsTable(function(err) {
      if (err) { console.error('[FAILED]', err); return; }
      db.all('SELECT * FROM migrations ORDER BY name DESC', function(err, dbResults) {
        if (err) { console.error('[FAILED]', err); return; }
        fs.readdir(options['migrations-dir'], function(err, files) {
          if (err) { console.error('[FAILED]', err); return; }
          files = files.sort();
          files = files.filter(function(file) {
            return /\.js$/.test(file);
          });
          files.forEach(function(file) {
            if (verbose) {
              console.log('processing file ' + file);
            }
            var migration = new Migration(path.join(options['migrations-dir'], file));
            var hasRun = dbResults.some(function(result) {
              return result.name === migration.name;
            });
            if (!hasRun) {
              migration.up(db, function(err) {
                if (err) { console.error('[FAILED]', err); return; }
              });
            }
          });
        });
      });
    });
  });

};
