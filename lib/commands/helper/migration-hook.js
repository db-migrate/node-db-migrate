
module.exports = function (internals) {
  var Migration = require('../../migration.js');
  return Migration.registerHook(internals.plugins, internals);
};
