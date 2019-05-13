var assert = require('assert');
var log = require('db-migrate-shared').log;

const Promise = require('bluebird');

module.exports = function (migrator, internals, originalErr, results) {
  return Promise.fromCallback(callback => {
    migrator.driver.close(function (err) {
      if ((err || originalErr) && typeof callback === 'function') {
        callback(originalErr || err);
        return;
      } else {
        assert.ifError(originalErr);
        assert.ifError(err);
        log.info('Done');
      }

      if (internals.argv['force-exit']) {
        log.verbose('Forcing exit');
        return process.exit(0);
      }

      if (typeof callback === 'function') {
        callback(null, results);
      }
    });
  });
};
