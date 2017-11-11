#!/usr/bin/env node

var resolve = require('resolve');
var log = require('db-migrate-shared').log;

process.title = 'db-migrate';
if (process.argv.indexOf('--verbose') !== -1 ||
     process.argv.indexOf('-v') !== -1
) { global.verbose = true; }

resolve('db-migrate', {

  basedir: process.cwd()
}, function (error, localModule) {
  var DBMigrate, dbmigrate;

  if (error) {
    DBMigrate = require('../');
  } else {
    DBMigrate = require(localModule);
    log.verbose('Detected and using the projects local version of db-migrate. ' +
      '\'' + localModule + '\'');
  }

  if (typeof (DBMigrate.getInstance) !== 'function') {
    DBMigrate = require('../');

    log.warn('Using global instead of local detected version as you have a ' +
      'version older than 0.10.0 in your projects package.json!');
  }

  dbmigrate = DBMigrate.getInstance();
  if (dbmigrate.registerAPIHook) {
    dbmigrate.registerAPIHook()
      .then(function () {
        dbmigrate.run();
      });
  } else { dbmigrate.run(); }
});
