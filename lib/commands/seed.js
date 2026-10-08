'use strict';

/**
 * Seeders are not part of db-migrate 1.0, their implementation was never
 * finished. A new concept follows separately, see #687.
 */
module.exports = function () {
  return Promise.reject(
    new Error(
      'Seeders are not supported by db-migrate 1.0. The unfinished seeders ' +
        'of db-migrate 0.11 are still available there.'
    )
  );
};
