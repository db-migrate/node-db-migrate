exports.connect = function(config, callback) {
  var driver = require('./' + config.driver);
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }
    callback(null, db);
  });
};
