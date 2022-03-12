'use strict';

var log = require('db-migrate-shared').log;
var assert = require('assert');

function executeDB (internals, config, callback) {
  var index = require('../../connect');

  if (internals.argv._.length > 0) {
    internals.argv.dbname = internals.argv._.shift().toString();
    // get the db name from .env using db:drop env.DB_NAME
    if(internals.argv.dbname.includes('env.')){
      var envDB = internals.argv.dbname.split('.')[1];
      internals.argv.dbname = process.env[envDB];
    }

  } else if(config.getCurrent().settings.schema){
    // get the db name from config json from schema setting without providing the dn name
    internals.argv.dbname = config.getCurrent().settings.schema;
  } else {
    log.info('Error: You must enter a database name!');
    return;
  }

  delete config.getCurrent().settings.database;

  index.driver(config.getCurrent().settings, function (err, db) {
    assert.ifError(err);

    if (internals.mode === 'create') {
      db.createDatabase(
        internals.argv.dbname,
        {
          ifNotExists: true
        },
        function (err) {
          if (err) {
            if (err.error) err = err.error;
            log.error('Error: Failed to create database!', err);
          } else {
            log.info('Created database "' + internals.argv.dbname + '"');
          }

          db.close();
          if (typeof callback === 'function') callback(err);
          else process.exit(err ? 1 : 0);
        }
      );
    } else if (internals.mode === 'drop') {
      db.dropDatabase(
        internals.argv.dbname,
        {
          ifExists: true
        },
        function (err) {
          if (err) {
            if (err.error) err = err.error;
            log.error('Error: Failed to drop database!', err);
          } else {
            log.info('Deleted database "' + internals.argv.dbname + '"');
          }

          db.close();
          if (typeof callback === 'function') callback(err);
          else process.exit(err ? 1 : 0);
        }
      );
    }
  });
}

module.exports = executeDB;
