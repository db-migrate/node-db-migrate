'use strict';

const seeder = require('./helper/seeder');

/**
 * Inserts the rows of the static seeds, removing those of earlier runs.
 */
module.exports = function (internals, config) {
  return seeder(internals, config, 'run');
};
