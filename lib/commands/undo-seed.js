'use strict';

const seeder = require('./helper/seeder');

/**
 * Removes the rows inserted by the static seeds.
 */
module.exports = function (internals, config) {
  return seeder(internals, config, 'undo');
};
