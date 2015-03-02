global.mod = global.mod || {};
global.mod.log = require('../log');
global.mod.type = require('../data_type');
global.mod.Class = require('../class');
var Shadow = require('./shadow');
var log = global.mod.log;

exports.connect = function (config, callback) {
  var driver, req;

  if (config.driver === undefined) {
    throw new Error(
      'config must include a driver key specifing which driver to use');
  }

  if (config.driver && typeof (config.driver) === 'object') {

    log.verbose('require:', config.driver.require);
    driver = require(config.driver.require);

  }
  else {
    try {

      req = 'db-migrate-' + config.driver;
      log.verbose('require:', req);

      try {

        driver = require(req);
      }
      catch (Exception) {

        driver = require('../../../' + req);
      }
    }
    catch (Exception) {

      //Fallback to internal drivers, while moving drivers to new repos
      req = './' + config.driver;
      log.verbose('require:', req);
      driver = require(req);
    }
  }

  log.verbose('connecting');
  driver.connect(config, function (err, db) {

    if (err) {

      callback(err);
      return;
    }
    log.verbose('connected');

    if(!global.immunity)
      db = Shadow.infect(db);

    callback(null, db);
  });
};