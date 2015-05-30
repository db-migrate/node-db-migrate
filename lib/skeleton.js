var path = require('path');
var inflection = require('./inflection');
var lpad = require('./util').lpad;
var Class = require('./class');

var internals = {};

function formatPath(dir, name) {
  return path.join(dir, name);
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
  date.setUTCDate(match[3]);
  date.setUTCMonth(match[2] - 1);
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

var Skeleton = Class.extend({

  init: function(intern) {
    internals = intern;
  },

  _up: function() {
    return require(this.path).up.apply(this, arguments);
  },

  _down: function() {
    return require(this.path).down.apply(this, arguments);
  },

  up: function(db, callback) {
    this._up(db, callback);
  },

  down: function(db, callback) {
    this._down(db, callback);
  },

  setup: function() {
    return require(this.path).setup;
  },

  parseName: function(path) {
  var match = path.match(/(\d{14}-[^.]+)(?:\.*?)?/);
  return match[1];
  },

  parseTitle: parseTitle,
  parseDate: parseDate,
  formatTitle: formatTitle,
  formatPath: formatPath,
  formatName: formatName

});

module.exports = Skeleton;
