require('pkginfo')(module, 'version'); // jshint ignore:line
var fs = require('fs');
var path = require('path');

exports.dataType = require('db-migrate-shared').dataType;

function loadPluginList () {
  var plugins = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
  );
  var targets = [];

  plugins = Object.assign(plugins.dependencies, plugins.devDependencies);

  for (var plugin in plugins) {
    if (plugin.startsWith('db-migrate-plugin')) targets.push(plugin);
  }

  return targets;
}

function loadPlugins () {
  var plugins = loadPluginList();
  var i = 0;
  var length = plugins.length;
  var hooks = {};

  for (; i < length; ++i) {
    var plugin = require(path.join(process.cwd(), 'node_modules', plugins[i]));

    if (
      typeof plugin.name !== 'string' ||
      !plugin.hooks ||
      !plugin.loadPlugin
    ) {
      continue;
    }

    plugin.hooks.map(function (hook) {
      hooks[hook] = hooks[hook] || [];
      hooks[hook].push(plugin);
    });
  }

  return hooks;
}

module.exports.getInstance = function (isModule, options, callback) {
  delete require.cache[require.resolve('./api.js')];
  delete require.cache[require.resolve('optimist')];
  var Mod = require('./api.js');
  var plugins = {};

  try {
    if (!options || !options.noPlugins) plugins = loadPlugins();
  } catch (ex) {}

  if (options && options.plugins) {
    plugins = Object.assign(plugins, options.plugins);
  }

  return new Mod(plugins, isModule, options, callback);
};
