var fs = require('fs');
var path = require('path');
var parseDatabaseUrl = require('parse-database-url');
var dbmUtil = require('./util');

exports.load = function(fileName, currentEnv) {
  try {
    fs.statSync(fileName);
  } catch(e) {
    throw new Error("Could not find database config file '" + fileName + "'");
  }
  var config;

  try {
    config = require(fileName);
  } catch(e) {
    // distinguish broken files from missing ones
    if (e instanceof SyntaxError){
      throw e;
    }

    config = require(path.join(process.cwd(), fileName));
  }

  for (var env in config) {
    if (config[env].ENV) {
      exports[env] = parseDatabaseUrl(process.env[config[env].ENV]);
    } else if (typeof(config[env]) === 'string') {
      exports[env] = parseDatabaseUrl(config[env]);
    } else {
      //Check config entry's for ENV objects
      //which will tell us to grab configuration from the environment
      for (var configEntry in config[env]) {
        if (config[env][configEntry] && config[env][configEntry].ENV){
          config[env][configEntry] =  process.env[config[env][configEntry].ENV];
        }
      }
      exports[env] = config[env];
    }
  }

  if(currentEnv) {
    setCurrent(currentEnv);
  } else if(config['default']) {
    setCurrent(config['default']);
  } else if(config.env) {
    setCurrent(config.env);
  } else {
    setCurrent(['dev', 'development']);
  }

  delete exports.load;
  delete exports.loadUrl;
};

exports.loadUrl = function(databaseUrl, currentEnv) {
  var config = parseDatabaseUrl(databaseUrl);
  if (currentEnv) {
    exports[currentEnv] = config;
    setCurrent(currentEnv);
  } else {
    exports.urlConfig = config;
    setCurrent('urlConfig');
  }

  delete exports.load;
  delete exports.loadUrl;
}

var setCurrent = exports.setCurrent = function (env) {
  env = dbmUtil.isArray(env) ? env : [env];

  env.forEach(function (current) {
    if (dbmUtil.isString(current) && exports[current]) {
      exports.getCurrent = function () {
        return {
          env: current,
          settings: exports[current]
        };
      };
    }
  });

  if (!exports.getCurrent) {
    throw new Error("Environment(s) '" + env.join(', ') + "' not found.");
  }
};
