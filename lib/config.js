var fs = require('fs');
var path = require('path');

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

  exports.setCurrent = function(env) {
    if(!exports[env]) {
      throw new Error("Environment '" + env + "' not found.");
    }

    exports.getCurrent = function() {
      return exports[env];
    }
  }

  delete exports.load;
};
