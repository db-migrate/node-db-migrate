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
    config = require(path.join(process.cwd(), fileName));
  }

  for (var env in config) {
    if (typeof(config[env]) == "string")
      exports[env] = parseDatabaseUrl(config[env]);
    else
      exports[env] = config[env];
  }

  if(currentEnv) {
    setCurrent(currentEnv);
  } else if(config['default']) {
    setCurrent(config['default']);
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
