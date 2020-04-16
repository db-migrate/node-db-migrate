var internals = {};

internals.mod = {};
internals.mod.log = require('db-migrate-shared').log;
internals.mod.type = require('db-migrate-shared').dataType;
var Shadow = require('./shadow');
var log = internals.mod.log;
var Promise = require('bluebird');
var SeederInterface = require('../interface/seederInterface.js');
var MigratorInterface = require('../interface/migratorInterface.js');
var resolve = require('resolve');

var ShadowProto = {
  createTable: function () {
    return Promise.resolve();
  }
};

exports.connect = function (config, intern, callback) {
  var driver, req;
  let plugin = false;
  const { plugins } = intern;

  var mod = internals.mod;
  internals = intern;
  internals.mod = mod;

  // add interface extensions to allow drivers to add new methods
  internals.interfaces = {
    SeederInterface: SeederInterface.extending,
    MigratorInterface: MigratorInterface.extending
  };

  if (!config.user && config.username) {
    config.user = config.username;
  }

  if (config.driver === undefined) {
    throw new Error(
      'config must include a driver key specifing which driver to use'
    );
  }

  if (config.driver && typeof config.driver === 'object') {
    log.verbose('require:', config.driver.require);
    driver = require(config.driver.require);
  } else {
    switch (config.driver) {
      case 'sqlite':
        config.driver = 'sqlite3';
        break;

      case 'postgres':
      case 'postgresql':
        config.driver = 'pg';
        break;
    }

    try {
      req = 'db-migrate-' + config.driver;
      log.verbose('require:', req);
      try {
        driver = require(resolve.sync(req, { basedir: process.cwd() }));
      } catch (e1) {
        try {
          driver = require(req);
        } catch (e2) {
          driver = require('../../../' + req);
        }
      }
    } catch (e3) {
      try {
        // Fallback to internal drivers, while moving drivers to new repos
        req = './' + config.driver;
        log.verbose('require:', req);
        driver = require(req);
      } catch (e4) {
        return callback(
          new Error(
            'No such driver found, please try to install it via ' +
              'npm install db-migrate-' +
              config.driver +
              ' or ' +
              'npm install -g db-migrate-' +
              config.driver
          )
        );
      }
    }
  }

  log.verbose('connecting');

  var connect = function (config) {
    driver.connect(config, intern, function (err, db) {
      if (err) {
        callback(err);
        return;
      }
      log.verbose('connected');

      if (!global.immunity) {
        db = Shadow.infect(db, internals, ShadowProto);
      }

      callback(null, db);
    });
  };

  if (config.tunnel) {
    var tunnel = require('tunnel-ssh');
    var tunnelConfig = JSON.parse(JSON.stringify(config.tunnel));
    const { tunnelType } = tunnelConfig;

    if (plugins) {
      plugin = plugins.overwrite(
        `connection:tunnel:${
          tunnelType && tunnelType !== 'ssh' ? tunnelType : 'ssh'
        }`
      );
    }

    tunnelConfig.dstHost = config.host;
    tunnelConfig.dstPort = config.port;

    if (plugin) {
      tunnel = plugin[
        `connection:tunnel:${
          tunnelType && tunnelType !== 'ssh' ? tunnelType : 'ssh'
        }`
      ](tunnelConfig);
    }

    if (tunnelConfig.privateKeyPath) {
      tunnelConfig.privateKey = require('fs').readFileSync(
        tunnelConfig.privateKeyPath
      );
    }

    // Reassign the db host/port to point to our local ssh tunnel
    config.host = '127.0.0.1';
    config.port = tunnelConfig.localPort;

    tunnel(tunnelConfig, function (err) {
      if (err) {
        callback(err);
        return;
      }
      log.verbose('SSH tunnel connected on port ', tunnelConfig.localPort);

      connect(config);
    });
  } else {
    connect(config);
  }
};
