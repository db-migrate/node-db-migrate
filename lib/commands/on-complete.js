var assert = require('assert');
var log = require('db-migrate-shared').log;

module.exports = function (migrator, internals, callback, originalErr, results) {
  if (typeof callback !== 'function') {
    originalErr = originalErr || callback;
    results = results || originalErr;
  }

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
};
