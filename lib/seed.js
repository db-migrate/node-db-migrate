var fs = require('fs');
var path = require('path');
var log = require('db-migrate-shared').log;
var Skeleton = require('./skeleton');

var Seed = Skeleton.extend({
  init: function () {
    if (arguments.length >= 3) {
      this.title = arguments[0];
      this.date = arguments[2];
      this.name = this.formatName(this.title, this.date);
      this.path = this.formatPath(arguments[1], this.name);
      this.templateType = arguments[3];
      this.internals = arguments[4];
    } else if (arguments.length === 2) {
      this.path = arguments[0];
      this.name = this.parseName(this.path);
      this.date = this.parseDate(this.name);
      this.title = this.parseTitle(this.name);
      this.internals = arguments[1];
    }

    this._super(this.internals);
  },

  up: function (db, isStatic) {
    if (isStatic) {
      var seed = require(this.path);
      var cbExecuted = false;

      return new Promise(
        function (resolve, reject) {
          var r = function (err) {
            if (cbExecuted === false) {
              cbExecuted = true;

              if (err) {
                log.error('Error while truncating static seed.');
                reject(err);
              } else resolve();
            }
          };

          Promise.resolve(seed.truncate.apply(this, [db, r]))
            .then(function (Promise) {
              if (Promise !== undefined && cbExecuted === false) {
                cbExecuted = true;
                resolve();
              }
            })
            .catch(function (err) {
              if (cbExecuted === false) {
                cbExecuted = true;
                reject(err);
              }
            });
        }.bind(this)
      ).then(function () {
        var seedExecuted = false;

        return new Promise(function (resolve, reject) {
          var r = function (err) {
            if (seedExecuted === false) {
              seedExecuted = true;

              if (err) {
                log.error('Error while seeding static seed.');
                reject(err);
              } else resolve();
            }
          };

          Promise.resolve(seed.seed.apply(this, [db, r]))
            .then(function (Promise) {
              if (Promise !== undefined && seedExecuted === false) {
                seedExecuted = true;
                resolve();
              }
            })
            .catch(function (err) {
              if (seedExecuted === false) {
                seedExecuted = true;
                reject(err);
              }
            });
        });
      });
    } else {
      return this._up(db);
    }
  },

  down: function (db) {
    return this._down(db);
  }
});

Seed.loadFromFilesystem = function (dir, internals, callback) {
  log.verbose('loading seeds from dir', dir);
  fs.readdir(dir, function (err, files) {
    if (err) {
      callback(err);
      return;
    }
    files = files.filter(function (file) {
      return internals.parser.filesRegEx.test(file);
    });
    var seeds = files.sort().map(function (file) {
      return new Seed(path.join(dir, file), internals);
    });
    callback(null, seeds);
  });
};

Seed.loadFromDatabase = function (dir, driver, internals, callback) {
  log.verbose('loading seeds from database');
  driver.allLoadedSeeds(function (err, dbResults) {
    if (err && !internals.dryRun) {
      callback(err);
      return;
    } else if (err && internals.dryRun) {
      dbResults = [];
    }
    var seeds = dbResults
      .filter(function (result) {
        return (
          result.name.substr(0, result.name.lastIndexOf('/')) ===
          internals.matching
        );
      })
      .map(function (result) {
        return new Seed(path.join(dir, result.name), internals);
      });

    callback(null, seeds);
  });
};

module.exports = Seed;
