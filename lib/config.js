var fs = require('fs');
var path = require('path');
var parseDatabaseUrl = require('parse-database-url');
var dbmUtil = require('./util');

var setCurrent = exports.setCurrent = function (env) {
  env = dbmUtil.isArray(env) ? env : [env];
  env.forEach(function (current) {
    if (dbmUtil.isString(current) && this[current]) {
      this.getCurrent = function () {
        return {
          env: current,
          settings: this[current]
        };
      };
    }
  }.bind(this));

  if (!this.getCurrent) {
    throw new Error('Environment(s) \'' + env.join(', ') + '\' not found.');
  }
};

function Config() {
}

Config.prototype = {
  setCurrent: setCurrent
};

exports.load = function(config, currentEnv) {
  if (typeof(config) === 'object') {
    return exports.loadObject(config, currentEnv);
  } else {
    return exports.loadFile(config, currentEnv);
  }
};

exports.loadFile = function(fileName, currentEnv) {
  var config;

  try {
    fs.statSync(fileName);
  } catch(e) {
    throw new Error('Could not find database config file \'' + fileName + '\'');
  }

  try {
    config = require(fileName);
  } catch(e) {
    // distinguish broken files from missing ones
    if (e instanceof SyntaxError){
      throw e;
    }

    config = require(path.join(process.cwd(), fileName));
  }

  return exports.loadObject(config, currentEnv);
};

exports.loadObject = function(config, currentEnv) {
  var out = new Config();

  for (var env in config) {
    if (config[env].ENV) {
      out[env] = parseDatabaseUrl(process.env[config[env].ENV]);
    } else if (typeof(config[env]) === 'string') {
      out[env] = parseDatabaseUrl(config[env]);
    } else {
      //Check config entry's for ENV objects
      //which will tell us to grab configuration from the environment
      for (var configEntry in config[env]) {
        if (config[env][configEntry] && config[env][configEntry].ENV){
          config[env][configEntry] =  process.env[config[env][configEntry].ENV];
        }
      }
      out[env] = config[env];
    }
  }

  if(currentEnv) {
    out.setCurrent(currentEnv);
  } else if(config['default']) {
    out.setCurrent(config['default']);
  } else if(config.defaultEnv) {
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

exports.loadUrl = function(databaseUrl, currentEnv) {
  var config = parseDatabaseUrl(databaseUrl),
      out = new Config();

  if (currentEnv) {
    out[currentEnv] = config;
    out.setCurrent(currentEnv);
  } else {
    out.urlConfig = config;
    out.setCurrent('urlConfig');
  }

  return out;
};
