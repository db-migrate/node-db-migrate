var util = require('util');
var Migration = require('./migration');
var config = require('./config');
var fs = require('fs');
var path = require('path');
var async = require('async');
var log = require('./log');

function goUp(db, migration, callback) {
  log.info('processing migration', migration.name);
  migration.up(db);
}

function goDown(db, migration) {
  log.info('processing migration', migration.name);
  migration.down(db);
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

function filterUp(files, dbResults, options) {
  return files.sort()
  .filter(function(file) {
    return /\.js$/.test(file);
  })
  .filter(function(file) {
    var hasRun = dbResults.some(function(result) {
      return result.name === Migration.parseName(file);
    });
    return !hasRun;
  })
  .filter(function(file) {
    return isIncludedInUp(file, options.destination);
  })
  .slice(0, options.count);
}

function filterDown(dbResults, options) {
  return dbResults
  .filter(function(result) {
    return isIncludedInDown(result.name, options.destination);
  })
  .slice(0, options.count);
}

function doUp(db, dbResults, files, options) {
  files = filterUp(files, dbResults, options);

  if (files.length < 1) {
    log.info('No migrations to run.');
    return;
  }

  async.forEachSeries(files, function(file, iterCallback) {
    var migration = new Migration(path.join(options['migrations-dir'], file));

    var workingCount = 0;
    var errors = [];

    var onError = function(err) {
      errors.push(err);
    };
    var onStart = function() {
      workingCount++;
    };
    var onEnd = function() {
      workingCount--;
      if (workingCount == 0) {
        db.removeListener('start', onStart);
        db.removeListener('end', onEnd);
        db.removeListener('error', onError);
        if (errors.length > 0) {
          log.error(errors);
          iterCallback(errors);
        } else {
          writeMigrationRecord(db, migration, iterCallback);
        }
      }
    };

    db.on('start', onStart);
    db.on('end', onEnd);
    db.on('error', onError);

    goUp(db, migration);
  }, function() {
    db.close();
  });
}

function doDown(db, dbResults, options) {
  dbResults = filterDown(dbResults, options);

  if (dbResults.length < 1) {
    log.info('No migrations to run.');
    return;
  }

  async.forEachSeries(dbResults, function(result, iterCallback) {
    var migration = new Migration(path.join(options['migrations-dir'], result.name + '.js'));

    var workingCount = 0;
    var errors = [];

    var onError = function(err) {
      errors.push(err);
    };
    var onStart = function() {
      workingCount++;
    };
    var onEnd = function() {
      workingCount--;
      if (workingCount == 0) {
        db.removeListener('start', onStart);
        db.removeListener('end', onEnd);
        db.removeListener('error', onError);
        if (errors.length > 0) {
          log.error(errors);
          iterCallback(errors);
        } else {
          deleteMigrationRecord(db, migration, iterCallback);
        }
      }
    };

    db.on('start', onStart);
    db.on('end', onEnd);
    db.on('error', onError);

    goDown(db, migration);
  }, function() {
    db.close();
  });
}

exports.up = function(options) {
  var env = config.getCurrent();
  var driver = require('./driver');
  driver.connect(env, function(err, db) {
    if (err) { log.error(err); return; }
    db.createMigrationsTable(function(err) {
      if (err) { log.error(err); return; }
      db.all('SELECT * FROM migrations ORDER BY name', function(err, dbResults) {
        if (err) { log.error(err); return; }
        fs.readdir(options['migrations-dir'], function(err, files) {
          if (err) { log.error(err); return; }
          doUp(db, dbResults, files, options);
        });
      });
    });
  });
};

exports.down = function(options) {
  var env = config.getCurrent();
  var driver = require('./driver');
  driver.connect(env, function(err, db) {
    if (err) { log.error(err); return; }
    db.createMigrationsTable(function(err) {
      if (err) { log.error(err); return; }
      db.all('SELECT * FROM migrations ORDER BY name DESC', function(err, dbResults) {
        if (err) { log.error(err); return; }
        doDown(db, dbResults, options);
      });
    });
  });
};

exports.create = function(options) {
  var migration = new Migration(options.title, new Date());
  migration.write(function(err) {
    if (err) {
      log.error(err);
    } else {
      log.info(util.format('Created migration at %s', migration.path));
    }
  });
};

