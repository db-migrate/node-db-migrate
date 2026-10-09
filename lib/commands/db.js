'use strict';

var log = require('db-migrate-shared').log;
var Promise = require('bluebird');

/**
 * Creates or drops a database, resolving once it is done.
 */
function executeDB (internals, config, callback) {
  var index = require('../../connect');

  if (internals.argv._.length === 0) {
    return Promise.reject(
      new Error('You must enter a database name!')
    ).asCallback(callback);
  }

  internals.argv.dbname = internals.argv._.shift().toString();
  delete config.getCurrent().settings.database;

  var create = internals.mode === 'create';
  if (!create && internals.mode !== 'drop') {
    return Promise.reject(
      new Error(
        (internals.mode ? 'Unknown db command "db:' + internals.mode + '"' : 'Missing db command') +
          ', use db:create or db:drop'
      )
    ).asCallback(callback);
  }

  return Promise.fromCallback(function (cb) {
    index.driver(config.getCurrent().settings, cb);
  })
    .then(function (db) {
      return Promise.fromCallback(function (cb) {
        if (create) {
          db.createDatabase(internals.argv.dbname, { ifNotExists: true }, cb);
        } else {
          db.dropDatabase(internals.argv.dbname, { ifExists: true }, cb);
        }
      })
        .catch(function (err) {
          throw err && err.error ? err.error : err;
        })
        .finally(function () {
          db.close();
        });
    })
    .then(function () {
      log.info(
        (create ? 'Created' : 'Deleted') +
          ' database "' +
          internals.argv.dbname +
          '"'
      );
    })
    .asCallback(callback);
}

module.exports = executeDB;
