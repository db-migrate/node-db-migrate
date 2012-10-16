var fs = require('fs');
var path = require('path');
var inflection = require('./inflection');
var lpad = require('./util').lpad;
var config = require('./config');

function formatPath(dir, name) {
  return path.join(dir, name + '.js');
}

function formatName(title, date) {
  return formatDate(date) + '-' + formatTitle(title);
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    lpad(date.getUTCMonth() + 1, '0', 2),
    lpad(date.getUTCDate(), '0', 2),
    lpad(date.getUTCHours(), '0', 2),
    lpad(date.getUTCMinutes(), '0', 2),
    lpad(date.getUTCSeconds(), '0', 2)
  ].join('');
}

function formatTitle(title) {
  return inflection.dasherize(title);
}

function parseDate(name) {
  var date = new Date();
  var match = name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-[^\.]+/);
  date.setUTCFullYear(match[1]);
  date.setUTCMonth(match[2] - 1);
  date.setUTCDate(match[3]);
  date.setUTCHours(match[4]);
  date.setUTCMinutes(match[5]);
  date.setUTCSeconds(match[6]);
  return date;
}

function parseTitle(name) {
  var match = name.match(/\d{14}-([^\.]+)/);
  var dashed = match[1];
  return inflection.humanize(dashed, true);
}

function writeMigrationRecord(db, migration, callback) {
  db._runSql('INSERT INTO migrations (name, run_on) VALUES (?, ?)', [migration.name, new Date()], callback);
}

var migrationTemplate = [
  "var dbm = require('db-migrate');",
  "var type = dbm.dataType;",
  "",
  "exports.up = function(db, callback) {",
  "",
  "};",
  "",
  "exports.down = function(db, callback) {",
  "",
  "};",
  ""
].join("\n");

Migration = function() {
  if (arguments.length == 3) {
    this.title = arguments[0];
    this.date = arguments[2];
    this.name = formatName(this.title, this.date);
    this.path = formatPath(arguments[1], this.name);
  } else if (arguments.length == 1) {
    this.path = arguments[0];
    this.name = Migration.parseName(this.path);
    this.date = parseDate(this.name);
    this.title = parseTitle(this.name);

    var migrationFile = require(this.path);
    this._up = migrationFile.up;
    this._down = migrationFile.down;
  }
};

Migration.prototype.write = function(callback) {
  fs.writeFile(this.path, migrationTemplate, callback);
};

Migration.prototype.up = function(db, callback) {
  this._up(db, callback);
};

Migration.prototype.down = function(db, callback) {
  this._down(db, callback);
};

Migration.parseName = function(path) {
  var match = path.match(/(\d{14}-[^.]+)\.js/);
  return match[1];
};

Migration.loadFromFilesystem = function(dir, callback) {
  fs.readdir(dir, function(err, files) {
    if (err) { callback(err); return; }
    files = files.filter(function(file) {
      return /\.js$/.test(file);
    })
    var migrations = files.sort().map(function(file) {
      return new Migration(path.join(dir, file));
    });
    callback(null, migrations);
  });
};

Migration.loadFromDatabase = function(dir, driver, callback) {
  driver.all('SELECT * FROM migrations ORDER BY name DESC', function(err, dbResults) {
    if (err) { callback(err); return; }
    var migrations = dbResults.map(function(result) {
      return new Migration(path.join(dir, result.name + '.js'));
    });
    callback(null, migrations);
  });
};

module.exports = Migration;
