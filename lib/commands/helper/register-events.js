'use strict';

var log = require('db-migrate-shared').log;

function registerEvents () {
  process.on('uncaughtException', function (err) {
    log.error('uncaughtException');
    log.error(err);
    process.exit(1);
  });

  process.on('unhandledRejection', function (reason) {
    log.error('unhandledRejection');
    log.error(reason);
    process.exit(1);
  });
}

module.exports = registerEvents;
