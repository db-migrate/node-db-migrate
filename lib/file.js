'use strict';

const fs = require('fs');
const path = require('path');
const log = require('db-migrate-shared').log;
const inflection = require('inflection');
const Promise = require('bluebird');
const lpad = require('db-migrate-shared').util.lpad;

Promise.promisifyAll(fs);

const File = function () {
  if (arguments.length >= 3) {
    this.title = arguments[0];
    this.date = arguments[2];
    this.name = this.formatName(this.title, this.date);
    this.path = this.formatPath(arguments[1], this.name);
    this.internals = arguments[4];
  } else if (arguments.length === 2) {
    this.path = this.formatPath(arguments[0]);
    this.name = this.parseName(this.path);
    this.date = this.parseDate(this.name);
    this.title = this.parseTitle(this.name);
    this.internals = arguments[1];
  }

  if (this.internals) {
    this.internals = this.internals.safeOptions;
  }
};

File.prototype = {
  parseName: function (path) {
    const match = path.match(/(\d{14}-[^.]+)(?:\.*?)?/);
    return match[1];
  },

  get: function () {
    return this._required || (this._required = require(this.path));
  },

  write: function (data) {
    return fs.writeFileAsync(this.path, data);
  },

  parseTitle: function (name) {
    const match = name.match(/\d{14}-([^.]+)/);
    return inflection.humanize(match[1], true);
  },

  parseDate: function parseDate (name) {
    const date = new Date();
    const match = name.match(
      /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-[^.]+/
    );
    date.setUTCFullYear(match[1]);
    date.setUTCDate(match[3]);
    date.setUTCMonth(match[2] - 1);
    date.setUTCHours(match[4]);
    date.setUTCMinutes(match[5]);
    date.setUTCSeconds(match[6]);
    return date;
  },

  formatTitle: function (title) {
    return inflection.dasherize(title);
  },

  formatPath: function (dir, name = '') {
    return path.join(dir, name);
  },

  formatName: function (title, date) {
    return `${this.formatDate(date)}-${this.formatTitle(title)}`;
  },

  formatDate: function (date) {
    return [
      date.getUTCFullYear(),
      lpad(date.getUTCMonth() + 1, '0', 2),
      lpad(date.getUTCDate(), '0', 2),
      lpad(date.getUTCHours(), '0', 2),
      lpad(date.getUTCMinutes(), '0', 2),
      lpad(date.getUTCSeconds(), '0', 2)
    ].join('');
  }
};

File.registerHook = function (Plugin, internals) {
  const plugin = []
    .concat(Plugin.hook('file:hook:require') || [])
    .concat(Plugin.hook('migrator:migration:hook:require') || [] // backwards compatible
    );

  internals.parser = internals.parser || {
    filesRegEx: /\.js$/,
    extensions: 'js'
  };

  if (!plugin || !plugin.length) {
    return Promise.resolve(null);
  }

  return Promise.resolve(plugin)
    .map(function (plugin) {
      // Backwards compatibility and notice for everyone so they
      // can bug the plugin maintainer
      if (plugin['migrator:migration:hook:require']) {
        log.warn(
          `The plugin '${plugin.name}' is outdated! The hook migrator:migration:hook:require was deprecated!`
        );
        log.warn(
          `Report the maintainer of '${plugin.name}' to patch the hook instead with file:hook:require.`
        );

        if (plugin.maintainer && plugin.maintainer.repository) {
          log.verbose(
            `The repo of the ${plugin.name} plugin is ${plugin.maintainer.repository}!`
          );
        }
        return plugin['migrator:migration:hook:require']();
      }

      return plugin['file:hook:require']();
    })
    .each(function (parser) {
      if (parser && parser.extensions) {
        internals.parser.extensions += `|${parser.extensions}`;
      }
    })
    .then(function () {
      internals.parser.filesRegEx = new RegExp(
        `\\.(${internals.parser.extensions})$`
      );

      return internals.parser;
    });
};

File.loadFromFileystem = function (dir, prefix, internals) {
  log.verbose(`[${prefix}] loading from dir`, dir);

  return fs
    .readdirAsync(dir)
    .filter(function (files) {
      return internals.parser.filesRegEx.test(files);
    })
    .then(function (files) {
      return files.sort();
    })
    .map(function (file) {
      return new File(path.join(dir, file), internals);
    });
};

File.loadFromDatabase = function (dir, prefix, driver, internals) {
  log.verbose(`[${prefix}] loading from database`);
  const LOADER = {
    seeder: 'allLoadedSeedsAsync',
    migration: 'allLoadedMigrationsAsync'
  };

  return driver[LOADER[prefix]]()
    .catch(function (err) {
      if (internals.dryRun) {
        return [];
      } else {
        return Promise.reject(err);
      }
    })
    .filter(function (result) {
      return (
        result.name.substr(0, result.name.lastIndexOf('/')) ===
        internals.matching
      );
    })
    .map(function (result) {
      return new File(path.join(dir, result.name), internals);
    });
};

module.exports = File;
