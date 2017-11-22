'use strict';

const log = require('db-migrate-shared').log;

function registerPluginLoader (plugins) {
  return {
    overwrite: function (name) {
      if (plugins[name] && plugins[name].length) {
        var plugin = plugins[name];

        if (plugin.length !== 1) {
          log.warn(
            'Attention, multiple overwrites registered for %s, we are ' +
              'only loading the first plugin %s!',
            name,
            plugin.name
          );
        }

        plugin = plugin[0];
        if (typeof plugin.loadPlugin === 'function') plugin.loadPlugin();

        return plugin;
      }

      return false;
    },

    hook: function (name) {
      if (plugins[name] && plugins[name].length) {
        var plugin = plugins[name];

        plugin.map(function (plugin) {
          if (typeof plugin.loadPlugin === 'function') plugin.loadPlugin();
        });

        return plugin;
      }

      return false;
    }
  };
}

module.exports = registerPluginLoader;
