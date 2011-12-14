var fs = require('fs');
var inflection = require('./inflection');
var lpad = require('./util').lpad;

function formatPath(name) {
  return process.cwd() + '/migrations/' + name + '.js';
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

var migrationTemplate = [
  "var dbm = require('db-migrate');",
  "var type = dbm.dataType;",
  "",
  "exports.up = function(db) {",
  "",
  "};",
  "",
  "exports.down = function(db) {",
  "",
  "};",
  ""
].join("\n");

Migration = function() {
  if (arguments.length == 2) {
    this.title = arguments[0];
    this.date = arguments[1];
    this.name = formatName(this.title, this.date);
    this.path = formatPath(this.name);
  } else if (arguments.length == 1) {
    this.path = arguments[0];
    this.name = Migration.parseName(this.path);
    this.date = parseDate(this.name);
    this.title = parseTitle(this.name);
  }
};

Migration.prototype.write = function(callback) {
  fs.writeFile(this.path, migrationTemplate, callback);
};

Migration.prototype.up = function(db) {
  var migrationFile = require(this.path);
  migrationFile.up(db);
};

Migration.prototype.down = function(db) {
  var migrationFile = require(this.path);
  migrationFile.down(db);
};

Migration.parseName = function(path) {
  var match = path.match(/(\d{14}-[^.]+)\.js/);
  return match[1];
};

module.exports = Migration;
