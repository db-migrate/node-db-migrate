const load = require('../lib/commands');

module.exports = {
  createSinglePlugin: (name, plugin) => {
    return load('fn/plugin.js')({
      [name]: [
        {
          [name]: plugin
        }
      ]
    });
  }
};
