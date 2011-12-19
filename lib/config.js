var fs = require('fs');
var path = require('path');
var dbmUtil = require('./util');

exports.load = function(fileName) {
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
    exports[env] = config[env];
  }

  delete exports.load;
};

exports.setCurrent = function(env) {
  var current = env;
  if (dbmUtil.isString(env)) {
    if(!exports[env]) {
      throw new Error("Environment '" + env + "' not found.");
    }
    var current = exports[env];
  }

  exports.getCurrent = function() {
    return current;
  }
}
