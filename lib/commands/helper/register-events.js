'use strict';

var log = require('db-migrate-shared').log;

function registerEvents () {
  process.on('uncaughtException', function (err) {
    log.error(err.stack || err);
    process.exit(1);
  });

  process.on('unhandledRejection', function (reason) {
    log.error(reason.stack || reason);
    process.exit(1);
  });
}

module.exports = registerEvents;
