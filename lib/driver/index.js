var internals = {};

internals.mod = internals.mod || {};
internals.mod.log = require('../log');
internals.mod.type = require('../data_type');
internals.mod.Class = require('../class');
var Shadow = require('./shadow');
var log = internals.mod.log;


exports.connect = function (config, intern, callback) {
  var driver, req;

  var mod = internals.mod;
  internals = intern;
  internals.mod = mod;

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
  driver.connect(config, intern, function (err, db) {

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