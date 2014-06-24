var fs = require('fs');
var path = require('path');
var walk = require('walk');
var inflection = require('./inflection');
var lpad = require('./util').lpad;
var config = require('./config');
var log = require('./log');

var filesRegEx = /\.js$/;
var coffeeSupported = false;
var coffeeModule = null;
try {
  coffeeModule = require('coffee-script');
  if (coffeeModule && coffeeModule.register) coffeeModule.register();
  coffeeSupported = true;
  filesRegEx = /\.(js|coffee)$/;
} catch (e) {}

function formatPath(dir, name) {
  return path.join(dir, name);
}

function formatName(title, date) {
  var name = formatTitle(title).split('/');
  name[name.length - 1] = formatDate(date) + '-' + name[name.length -1];
  return name.join('/');
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
  "var lines = [",
  "",
  "];",
  "",
  "exports.up = function(db, cb){ require('async').eachSeries(lines, db.runSql.bind(db), cb); };",
  ""
].join("\n");

Migration = function() {
  if (arguments.length == 3) {
    this.title = arguments[0];
    this.date = arguments[2];
    this.name = formatName(this.title, this.date);
    this.path = formatPath(arguments[1], this.name);
  } else if (arguments.length == 2) {
    this.path = arguments[0];
    this.name = Migration.parseName(this.path, arguments[1]);
    this.date = parseDate(this.name);
    this.title = parseTitle(this.name);
  }
};

Migration.prototype._up = function() {
  return require(this.path).up.apply(this, arguments);
};

Migration.prototype._down = function() {
  return require(this.path).down.apply(this, arguments);
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

Migration.parseName = function(path, dir) {
  return path.replace(dir + '/', '').replace('.js', '');
};

Migration.loadFromFilesystem = function(dir, callback) {
  log.verbose('loading migrations from dir', dir);
  var walker = walk.walk(dir),
      files = [];
  walker.on('file', function(root, file, next){
    files.push((root.replace(dir, '') + '/').substr(1) + file.name);
    next();
  });
  walker.on('end', function(){
    files.sort();
    var coffeeWarn = true;
    files = files.filter(function(file) {
      if (coffeeWarn && !coffeeSupported && /\.coffee$/.test(file)) {
        log.warn('CoffeeScript not installed');
        coffeeWarn = false;
      }
      return filesRegEx.test(file);
    });
    var migrations = files.sort().map(function(file) {
      return new Migration(path.join(dir, file), dir);
    });

    callback(null, migrations);
  });
};

Migration.loadFromDatabase = function(dir, driver, callback) {
  log.verbose('loading migrations from database');
  driver.all('SELECT * FROM migrations ORDER BY name DESC', function(err, dbResults) {
    if (err) { callback(err); return; }
    var migrations = dbResults.map(function(result) {
      return new Migration(path.join(dir, result.name), dir);
    });
    callback(null, migrations);
  });
};

module.exports = Migration;
