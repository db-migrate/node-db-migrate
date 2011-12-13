var util = require('util');
var Migration = require('./migration');
var config = require('./config');
var fs = require('fs');
var path = require('path');

function goUp(db, migration) {
  if (verbose) {
    console.log('processing migration ' + migration.name);
  }
  migration.up(db, function(err) {
    if (err) { console.error('[FAILED]', err); return; }
  });
}

function goDown(db, migration) {
  if (verbose) {
    console.log('processing migration ' + migration.name);
  }
  migration.down(db, function(err) {
    if (err) { console.error('[FAILED]', err); return; }
  });
}

function writeMigrationRecord(db, migration, callback) {
  db._runSql('INSERT INTO migrations (name, run_on) VALUES (?, ?)', [migration.name, new Date()], callback);
}

function deleteMigrationRecord(db, migration, callback) {
  db._runSql('DELETE FROM migrations WHERE name = ?', [migration.name], callback);
}

function isIncludedInUp(workingFile, destination) {
  if(!destination) {
    return true;
  }
  var workingFileTest = workingFile.substring(0, Math.min(workingFile.length, destination.length));
  var destinationTest = destination.substring(0, Math.min(workingFile.length, destination.length));
  return workingFileTest <= destinationTest;
}

function isIncludedInDown(workingFile, destination) {
  if(!destination) {
    return true;
  }
  var workingFileTest = workingFile.substring(0, Math.min(workingFile.length, destination.length));
  var destinationTest = destination.substring(0, Math.min(workingFile.length, destination.length));
  return workingFileTest >= destinationTest;
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
          var runCount = 0;

          db.on('start', function() {
            workingCount++;
          });
          db.on('end', function() {
            workingCount--;
            if (workingCount == 0 && errorCount == 0) {
              writeMigrationRecord(db, workingMigration, function(err) {
                if (err) { console.error('[FAILED]', err); return; }
                runCount++;
                console.log('worked off', workingMigration.name);
                if (files.length > 0 && runCount < options.count && isIncludedInUp(files[0], options.destination)) {
                  workingFile = files[0];
                  workingMigration = new Migration(path.join(options['migrations-dir'], workingFile));
                  files = files.slice(1);
                  goUp(db, workingMigration);
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
          if (files.length > 0 && isIncludedInUp(files[0], options.destination)) {
            workingFile = files[0];
            workingMigration = new Migration(path.join(options['migrations-dir'], workingFile));
            files = files.slice(1);
            goUp(db, workingMigration);
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
        var workingCount = 0;
        var errorCount = 0;
        var workingMigration = null;
        var runCount = 0;

        db.on('start', function() {
          workingCount++;
        });
        db.on('end', function() {
          workingCount--;
          if (workingCount == 0 && errorCount == 0) {
            deleteMigrationRecord(db, workingMigration, function(err) {
              if (err) { console.error('[FAILED]', err); return; }
              runCount++;
              console.log('worked off', workingMigration.name);
              if (dbResults.length > 0 && runCount < options.count && isIncludedInDown(dbResults[0].name, options.destination)) {
                workingMigration = new Migration(path.join(options['migrations-dir'], dbResults[0].name + '.js'));
                dbResults = dbResults.slice(1);
                goDown(db, workingMigration);
              }
            });
          }
        });
        db.on('error', function() {
          errorCount++;
        });

        if (dbResults.length > 0 && isIncludedInDown(dbResults[0].name, options.destination)) {
          workingMigration = new Migration(path.join(options['migrations-dir'], dbResults[0].name + '.js'));
          dbResults = dbResults.slice(1);
          goDown(db, workingMigration);
        } else {
          console.log('No migrations to run');
        }
      });
    });
  });
};
