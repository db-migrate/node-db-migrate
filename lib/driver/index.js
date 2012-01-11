exports.connect = function(config, callback) {
  if (config.driver === undefined) {
    throw new Error('config must include a driver key specifing which driver to use');
  }

  var driver = require('./' + config.driver);
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }
    callback(null, db);
  });
};
