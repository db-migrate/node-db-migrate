module.exports = function (internals) {
  var Migration = require('../../file.js');
  return Migration.registerHook(internals.plugins, internals);
};
