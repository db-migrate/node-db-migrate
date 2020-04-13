var fs = require('fs');
var path = require('path');
var parseDatabaseUrl = require('parse-database-url');
var dbmUtil = require('db-migrate-shared').util;
var log = require('db-migrate-shared').log;

var setCurrent = (exports.setCurrent = function (env) {
  env = dbmUtil.isArray(env) ? env : [env];
  env.forEach(
    function (current) {
      if (dbmUtil.isString(current) && this[current]) {
        this.getCurrent = function () {
          return {
            env: current,
            settings: this[current]
          };
        };
      }
    }.bind(this)
  );

  if (!this.getCurrent) {
    throw new Error("Environment(s) '" + env.join(', ') + "' not found.");
  }
});

function Config () {}

Config.prototype = {
  setCurrent: setCurrent
};

exports.load = function (config, currentEnv) {
  if (typeof config === 'object') {
    return exports.loadObject(config, currentEnv);
  } else {
    return exports.loadFile(config, currentEnv);
  }
};

exports.loadFile = function (fileName, currentEnv, plugins) {
  var config;

  try {
    fs.statSync(fileName);
  } catch (e) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Could not find database config file '" + fileName + "'");
    } else {
      return exports.loadUrl(process.env.DATABASE_URL, currentEnv);
    }
  }

  try {
    var plugin = false;

    if (plugins) {
      plugin = plugins.overwrite('init:config:overwrite:require');
    }

    if (plugin !== false) {
      try {
        config = plugin['init:config:overwrite:require'](fileName);
      } catch (ex) {
        log.warn(
          'Plugin failure "' +
            plugin.name +
            '", falling back to default behavior!'
        );
        log.verbose(ex);

        config = require(fileName);
      }
    } else {
      config = require(fileName);
    }
  } catch (e) {
    // distinguish broken files from missing ones
    if (e instanceof SyntaxError) {
      throw e;
    }

    try {
      config = require(path.join(process.cwd(), fileName));
    } catch (e) {
      if (!process.env.DATABASE_URL) {
        throw e;
      } else {
        return exports.loadUrl(process.env.DATABASE_URL, currentEnv);
      }
    }
  }

  return exports.loadObject(config, currentEnv);
};

function walkConfig (level) {
  for (var configEntry in level) {
    if (level[configEntry] && level[configEntry].ENV) {
      if (!process.env[level[configEntry].ENV]) {
        log.verbose(
          'Environment variable ' + level[configEntry].ENV + ' is empty!'
        );
      }

      level[configEntry] = process.env[level[configEntry].ENV];
    } else if (level[configEntry] && typeof level[configEntry] === 'object') {
      level[configEntry] = walkConfig(level[configEntry]);
    }
  }

  return level;
}

exports.loadObject = function (_config, currentEnv) {
  var out = new Config();
  // do not overwrite the users config
  var config = JSON.parse(JSON.stringify(_config));

  for (var env in config) {
    if (config[env].ENV) {
      if (!process.env[config[env].ENV]) {
        log.verbose('Environment variable ' + config[env].ENV + ' is empty!');
      } else {
        out[env] = parseDatabaseUrl(process.env[config[env].ENV]);
      }
    } else if (typeof config[env] === 'string') {
      out[env] = parseDatabaseUrl(config[env]);
    } else {
      // Check config entry's for ENV objects
      // which will tell us to grab configuration from the environment
      config[env] = walkConfig(config[env]);
      out[env] = config[env];
    }

    if (typeof config[env].url === 'string' || process.env.DATABASE_URL) {
      if (typeof config[env].url !== 'string') {
        config[env] = Object.assign(
          config[env],
          parseDatabaseUrl(process.env.DATABASE_URL)
        );
      } else {
        config[env] = Object.assign(
          config[env],
          parseDatabaseUrl(config[env].url)
        );
      }
      delete config[env].url;
    } else if (config[env].url && config[env].url.value) {
      config[env].url = config[env].url.value;
    }

    if (config[env].overwrite || config[env].addIfNotExists) {
      var overwrite = config[env].overwrite || {};

      if (config[env].addIfNotExists) {
        var addIfNotExists = config[env].addIfNotExists;
        Object.keys(addIfNotExists)
          .filter(function (key) {
            return !overwrite[key] && !config[env][key];
          })
          .forEach(function (key) {
            config[env][key] = addIfNotExists[key];
          });

        delete config[env].addIfNotExists;
      }

      Object.keys(overwrite).forEach(function (key) {
        config[env][key] = overwrite[key];
      });

      delete config[env].overwrite;
    }
  }

  if (currentEnv) {
    out.setCurrent(currentEnv);
  } else if (config.default) {
    out.setCurrent(config.default);
  } else if (config.defaultEnv) {
    if (config.defaultEnv.ENV) {
      out.setCurrent(process.env[config.defaultEnv.ENV]);
    } else {
      out.setCurrent(config.defaultEnv);
    }
  } else {
    out.setCurrent(['dev', 'development']);
  }

  return out;
};

exports.loadUrl = function (databaseUrl, currentEnv) {
  var config = parseDatabaseUrl(databaseUrl);
  var out = new Config();

  if (currentEnv) {
    out[currentEnv] = config;
    out.setCurrent(currentEnv);
  } else {
    out.urlConfig = config;
    out.setCurrent('urlConfig');
  }

  return out;
};
