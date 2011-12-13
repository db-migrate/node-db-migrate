var util = require('util');
var Migration = require('./migration');
var config = require('./config');
var fs = require('fs');
var path = require('path');

function goUp(db, dbResults, migration) {
  if (verbose) {
    console.log('processing migration ' + migration.name);
  }
  migration.up(db, function(err) {
    if (err) { console.error('[FAILED]', err); return; }
  });
}

function writeMigrationRecord(db, migration, callback) {
  db.runSql('INSERT INTO migrations (name, run_on) VALUES (?, ?)', [migration.name, new Date()], callback);
}

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
  var driver = require('./driver');
  driver.connect(env, function(err, db) {
    if (err) { console.error('[FAILED]', err); return; }
    db.createMigrationsTable(function(err) {
      if (err) { console.error('[FAILED]', err); return; }
      db.all('SELECT * FROM migrations ORDER BY name', function(err, dbResults) {
        if (err) { console.error('[FAILED]', err); return; }
        fs.readdir(options['migrations-dir'], function(err, files) {
          if (err) { console.error('[FAILED]', err); return; }

          var workingCount = 0;
          var errorCount = 0;
          var workingFile = null;
          var workingMigration = null;
          db.on('start', function() {
            workingCount++;
          });
          db.on('end', function() {
            workingCount--;
            if (workingCount == 0 && errorCount == 0) {
              writeMigrationRecord(db, workingMigration, function(err) {
                if (err) { console.error('[FAILED]', err); return; }
                console.log('worked off', workingMigration.name);
                if (files.length > 0) {
                  workingFile = files[0];
                  workingMigration = new Migration(path.join(options['migrations-dir'], workingFile));
                  files = files.slice(1);
                  goUp(db, dbResults, workingMigration);
                }
              });
            }
          });
          db.on('error', function() {
            errorCount++;
          });

          files = files.sort();
          files = files.filter(function(file) {
            return /\.js$/.test(file);
          }).filter(function(file) {
            var hasRun = dbResults.some(function(result) {
              return result.name === Migration.parseName(file);
            });
            return !hasRun;
          });
          if (files.length > 0) {
            workingFile = files[0];
            workingMigration = new Migration(path.join(options['migrations-dir'], workingFile));
            files = files.slice(1);
            goUp(db, dbResults, workingMigration);
          } else {
            console.log('No migrations to run');
          }
        });
      });
    });
  });
};

exports.down = function(options) {
  var env = config.getCurrent();
  var driver = require('./driver');
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
