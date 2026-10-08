'use strict';

var log = require('db-migrate-shared').log;
var formatError = require('../../format-error');

function registerEvents () {
  process.on('uncaughtException', function (err) {
    log.error('uncaughtException');
    log.error(formatError(err, { verbose: global.verbose }));
    process.exit(1);
  });

  process.on('unhandledRejection', function (reason) {
    log.error('unhandledRejection');
    log.error(formatError(reason, { verbose: global.verbose }));
    process.exit(1);
  });
}

module.exports = registerEvents;
