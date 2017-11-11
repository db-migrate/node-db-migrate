var path = require('path');
var inflection = require('inflection');
var Promise = require('bluebird');
var lpad = require('db-migrate-shared').util.lpad;
var Class = require('./class');

function isPromise (probe) {
  return (
    probe instanceof Promise ||
    (probe &&
      probe.then &&
      probe.constructor &&
      probe.constructor.name === 'Promise')
  );
}

function formatPath (dir, name) {
  return path.join(dir, name);
}

function formatName (title, date) {
  return formatDate(date) + '-' + formatTitle(title);
}

function formatDate (date) {
  return [
    date.getUTCFullYear(),
    lpad(date.getUTCMonth() + 1, '0', 2),
    lpad(date.getUTCDate(), '0', 2),
    lpad(date.getUTCHours(), '0', 2),
    lpad(date.getUTCMinutes(), '0', 2),
    lpad(date.getUTCSeconds(), '0', 2)
  ].join('');
}

function formatTitle (title) {
  return inflection.dasherize(title);
}

function parseDate (name) {
  var date = new Date();
  var match = name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-[^.]+/);
  date.setUTCFullYear(match[1]);
  date.setUTCDate(match[3]);
  date.setUTCMonth(match[2] - 1);
  date.setUTCHours(match[4]);
  date.setUTCMinutes(match[5]);
  date.setUTCSeconds(match[6]);
  return date;
}

function parseTitle (name) {
  var match = name.match(/\d{14}-([^.]+)/);
  var dashed = match[1];
  return inflection.humanize(dashed, true);
}

var Skeleton = Class.extend({
  init: function (intern) {
    this.internals = intern;
  },

  _up: function () {
    var params = arguments;

    var cbExecuted = false;

    return new Promise(
      function (resolve, reject) {
        var migration;
        var r = function (err) {
          if (cbExecuted === false) {
            cbExecuted = true;

            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        };

        params[params.length++] = r;

        migration = require(this.path).up.apply(this, params);

        if (migration === null) migration = Promise.resolve();
        if (isPromise(migration)) {
          migration
            .then(function () {
              if (cbExecuted === false) {
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
        }
      }.bind(this)
    );
  },

  _down: function () {
    var params = arguments;
    var cbExecuted = false;

    return new Promise(
      function (resolve, reject) {
        var migration;
        var r = function (err) {
          if (cbExecuted === false) {
            cbExecuted = true;

            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        };

        params[params.length++] = r;
        migration = require(this.path).down.apply(this, params);

        if (migration === null) migration = Promise.resolve();
        if (isPromise(migration)) {
          migration
            .then(function () {
              if (cbExecuted === false) {
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
        }
      }.bind(this)
    );
  },

  up: function (db) {
    return this._up(db);
  },

  down: function (db) {
    return this._down(db);
  },

  setup: function () {
    return require(this.path).setup;
  },

  parseName: function (path) {
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
