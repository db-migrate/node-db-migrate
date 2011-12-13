exports.load = function(path) {
  var config = require(path);

  for (var env in config) {
    exports[env] = config[env];
  }

  exports.setCurrent = function(env) {
    exports.getCurrent = function() {
      return exports[env];
    }
  }

  delete exports.load;
};

