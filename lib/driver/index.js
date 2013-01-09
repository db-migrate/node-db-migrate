var log = require('../log');

exports.connect = function(config, callback) {
  if (config.driver === undefined) {
    throw new Error('config must include a driver key specifing which driver to use');
  }

  var req = './' + config.driver;
  log.verbose('require:', req);
  var driver = require(req);
  log.verbose('connecting');
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }
    log.verbose('connected');
    callback(null, db);
  });
};
