'use strict';

const Promise = require('bluebird');
const load = require('../../lib/commands');
const proxyquire = require('proxyquire').noPreserveCache();
const rmdir = Promise.promisify(require('rimraf'));
const path = require('path');

exports.createSinglePlugin = function (name, plugin) {
  return load('fn/plugin.js')({
    [name]: [
      {
        [name]: plugin
      }
    ]
  });
};

exports.stubApiInstance = function (isModule, stubs, options, callback) {
  delete require.cache[require.resolve('../../api.js')];
  delete require.cache[require.resolve('yargs')];
  const Mod = proxyquire('../../api.js', stubs);
  const plugins = {};
  options = options || {};

  options = Object.assign(options, {
    throwUncatched: true,
    cwd: __dirname
  });

  return new Mod(plugins, isModule, options, callback);
};

exports.migrationsFolder = path.join(__dirname, 'migrations');
exports.wipeMigrations = function () {
  const dir = this.migrationsFolder;
  return rmdir(dir);
};
