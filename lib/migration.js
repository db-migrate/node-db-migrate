var fs = require('fs');
var path = require('path');
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

function formatName(title, date, transactionless) {
  return formatDate(date) + '-' + (transactionless ? 'NO-TRANS-' : '') + formatTitle(title);
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
  date.setUTCDate(match[3]);
  date.setUTCMonth(match[2] - 1);
  date.setUTCHours(match[4]);
  date.setUTCMinutes(match[5]);
  date.setUTCSeconds(match[6]);
  return date;
}

function parseTitle(name) {
  var match = name.match(/\d{14}-([^\.]+)/);
  var dashed = match[1].replace(/NO-TRANS(-)?/i,'');
  return inflection.humanize(dashed, true);
}

function parseTransactionless(name) {
  return name.match(/NO-TRANS/i) === null;
}

function writeMigrationRecord(db, migration, callback) {
  db._runSql('INSERT INTO ' + global.migrationTable + ' (name, run_on) VALUES (?, ?)', [migration.name, new Date()], callback);
}

Migration = function() {
  if (arguments.length >= 3) {
    this.title = arguments[0];
    this.date = arguments[2];
    this.transactionless = arguments.length > 4 ? arguments[4] : false;
    this.name = formatName(this.title, this.date, this.transactionless);
    this.path = formatPath(arguments[1], this.name);
    this.templateType = arguments[3];
  } else if (arguments.length == 1) {
    this.path = arguments[0];
    this.name = Migration.parseName(this.path);
    this.date = parseDate(this.name);
    this.title = parseTitle(this.name);
    this.transactionless = parseTransactionless(this.name);
  }
};

Migration.prototype.defaultCoffeeTemplate = function() {
  return [
    "var dbm = -> global.dbm or require 'db-migrate'",
    "type   = dbm.dataType",
    "",
    "exports.up = (db, callback) ->",
    "",
    "",
    "exports.down = (db, callback) ->",
    "",
    "",
    ""
  ].join("\n");
};

Migration.prototype.defaultJsTemplate = function() {
  return [
    "var dbm = global.dbm || require('db-migrate');",
    "var type = dbm.dataType;",
    "",
    "exports.up = function(db, callback) {",
    "  callback();",
    "};",
    "",
    "exports.down = function(db, callback) {",
    "  callback();",
    "};",
    ""
  ].join("\n");
};

Migration.prototype.defaultSqlTemplate = function() {
  return "/* Replace with your SQL commands */";
};


Migration.prototype.sqlFileLoaderTemplate = function() {
  return [
    "var dbm = global.dbm || require('db-migrate');",
    "var type = dbm.dataType;",
    "var fs = require('fs');",
    "var path = require('path');",
    "",
    "exports.up = function(db, callback) {",
    "  var filePath = path.join(__dirname + '/sqls/"+this.name.replace('.js', '')+"-up.sql');",
    "  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){",
    "    if (err) return callback(err);",
    "      console.log('received data: ' + data);",
    "",
    "    db.runSql(data, function(err) {",
    "      if (err) return callback(err);",
    "      callback();",
    "    });",
    "  });",
    "};",
    "",
    "exports.down = function(db, callback) {",
    "  var filePath = path.join(__dirname + '/sqls/"+this.name.replace('.js', '')+"-down.sql');",
    "  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){",
    "    if (err) return callback(err);",
    "      console.log('received data: ' + data);",
    "",
    "    db.runSql(data, function(err) {",
    "      if (err) return callback(err);",
    "      callback();",
    "    });",
    "  });",
    "};",
    ""
  ].join("\n");
};

Migration.TemplateType = {
  DEFAULT_JS: 0,
  DEFAULT_SQL: 1,
  SQL_FILE_LOADER: 2,
  DEFAULT_COFFEE: 3
};

Migration.prototype.getTemplate = function() {
  switch (this.templateType) {
    case Migration.TemplateType.DEFAULT_SQL:
      return this.defaultSqlTemplate();
    case Migration.TemplateType.SQL_FILE_LOADER:
      return this.sqlFileLoaderTemplate();
    case Migration.TemplateType.DEFAULT_COFFEE:
      return this.defaultCoffeeTemplate();
    case Migration.TemplateType.DEFAULT_JS:
    default:
      return this.defaultJsTemplate();
  }
};

Migration.prototype._up = function() {
  return require(this.path).up.apply(this, arguments);
};

Migration.prototype._down = function() {
  return require(this.path).down.apply(this, arguments);
};

Migration.prototype.write = function(callback) {
  fs.writeFile(this.path, this.getTemplate(), callback);
};

Migration.prototype.up = function(db, callback) {
  this._up(db, callback);
};

Migration.prototype.down = function(db, callback) {
  this._down(db, callback);
};

Migration.parseName = function(path) {
  var match = path.match(/(\d{14}-[^.]+)(?:\.*?)?/);
  return match[1];
};

Migration.loadFromFilesystem = function(dir, callback) {
  log.verbose('loading migrations from dir', dir);
  fs.readdir(dir, function(err, files) {
    if (err) { callback(err); return; }
    var coffeeWarn = true;
    files = files.filter(function(file) {
      if (coffeeWarn && !coffeeSupported && /\.coffee$/.test(file)) {
        log.warn('CoffeeScript not installed');
        coffeeWarn = false;
      }
      return filesRegEx.test(file);
    });
    var migrations = files.sort().map(function(file) {
      return new Migration(path.join(dir, file));
    });
    callback(null, migrations);
  });
};

Migration.loadFromDatabase = function(dir, driver, callback) {
  log.verbose('loading migrations from database');
  driver.allLoadedMigrations(function(err, dbResults) {
    if (err && !global.dryRun) { callback(err); return; }
    else if (err && global.dryRun) {
      dbResults = []
    }
    var migrations = dbResults.filter(function(result) {
      return result.name.substr(0,result.name.lastIndexOf('/')) === global.matching;
    }).map(function(result) {
      return new Migration(path.join(dir, result.name));
    });

    callback(null, migrations);
  });
};

module.exports = Migration;
