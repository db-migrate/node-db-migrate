module.exports.version = require('./package.json').version;

var fs = require('fs');
var path = require('path');
var log = require('db-migrate-shared').log;

exports.dataType = require('db-migrate-shared').dataType;

function loadPluginList (options) {
  try {
    fs.accessSync(path.join(options.cwd, 'package.json'), fs.constants.R_OK);
  } catch (err) {
    throw new Error(
      'There was no package.json found in the current working dir!',
      options.cwd
    );
  }

  try {
    var plugins = JSON.parse(
      fs.readFileSync(path.join(options.cwd, 'package.json'), 'utf-8')
    );
  } catch (err) {
    throw new Error('Error parsing package.json', err);
  }

  var targets = [];

  plugins = Object.assign(
    plugins.dependencies || {},
    plugins.devDependencies || {}
  );

  for (var plugin in plugins) {
    if (plugin.startsWith('db-migrate-plugin')) targets.push(plugin);
  }

  return targets;
}

function loadPlugins (options) {
  var plugins = loadPluginList(options);
  var i = 0;
  var length = plugins.length;
  var hooks = {};

  for (; i < length; ++i) {
    var plugin = require(path.join(options.cwd, 'node_modules', plugins[i]));

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

module.exports.getInstance = function (isModule, options = {}, callback) {
  delete require.cache[require.resolve('./api.js')];
  delete require.cache[require.resolve('yargs')];
  var Mod = require('./api.js');
  var plugins = {};
  options.cwd = options.cwd || process.cwd();

  try {
    if (!options || !options.noPlugins) plugins = loadPlugins(options);
  } catch (ex) {
    log.verbose('No plugin could be loaded!');
    log.verbose(ex);
  }

  if (options && options.plugins) {
    plugins = Object.assign(plugins, options.plugins);
  }

  return new Mod(plugins, isModule, options, callback);
};
