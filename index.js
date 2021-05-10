module.exports.version = require('./package.json').version;

const fs = require('fs');
const path = require('path');
const log = require('db-migrate-shared').log;

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

  let plugins;
  try {
    plugins = JSON.parse(
      fs.readFileSync(path.join(options.cwd, 'package.json'), 'utf-8')
    );
  } catch (err) {
    throw new Error('Error parsing package.json', err);
  }

  const targets = [];

  plugins = Object.assign(
    plugins.dependencies || {},
    plugins.devDependencies || {}
  );

  for (const plugin in plugins) {
    if (plugin.startsWith('db-migrate-plugin')) targets.push(plugin);
  }

  return targets;
}

function loadPlugins (options) {
  const plugins = loadPluginList(options);
  let i = 0;
  const length = plugins.length;
  const hooks = {};

  for (; i < length; ++i) {
    const plugin = require(path.join(options.cwd, 'node_modules', plugins[i]));

    if (!plugin.hooks || !plugin.loadPlugin) {
      continue;
    }

    // name is now derived from package name
    plugin.name = plugins[i];

    plugin.hooks.forEach(function (hook) {
      hooks[hook] = hooks[hook] || [];
      hooks[hook].push(plugin);
    });
  }

  return hooks;
}

module.exports.getInstance = function (isModule, options = {}, callback = () => {}) {
  delete require.cache[require.resolve('./api.js')];
  delete require.cache[require.resolve('yargs')];
  const Mod = require('./api.js');
  let plugins = {};
  options.cwd = options.cwd || process.cwd();

  try {
    if (!options || !options.noPlugins) {
      plugins = loadPlugins(options);
    }
  } catch (ex) {
    log.verbose('No plugin could be loaded!');
    log.verbose(ex);
  }

  if (options && options.plugins) {
    plugins = Object.assign(plugins, options.plugins);
  }

  return new Mod(plugins, isModule, options, callback);
};
