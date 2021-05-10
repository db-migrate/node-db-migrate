module.exports = function (internals) {
  const Migration = require('../../file.js');
  return Migration.registerHook(internals.plugins, internals);
};
