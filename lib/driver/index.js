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

/**
 * Attach the failed statement to errors of the driver, so the error output
 * can show what failed. Drivers already setting sql (mysql2) keep theirs.
 */
const annotateSql = (err, sql, hasParams) => {
  if (err && typeof err === 'object' && err.sql === undefined) {
    try {
      err.sql = sql;
      // the values are not kept, they might be sensitive
      Object.defineProperty(err, 'sqlParams', { value: hasParams });
    } catch (e) {}
  }

  return err;
};

function trackSql (db) {
  ['runSql', 'all'].forEach(method => {
    const original = db[method];

    if (typeof original !== 'function') {
      return;
    }

    db[method] = function (sql, ...args) {
      const callback =
        typeof args[args.length - 1] === 'function' ? args.pop() : null;
      const hasParams = args.length > 0;

      if (callback) {
        // the returned promise is left alone, the callback handles errors
        return original.call(this, sql, ...args, function (err, ...res) {
          return callback.call(
            this,
            err ? annotateSql(err, sql, hasParams) : err,
            ...res
          );
        });
      }

      const ret = original.call(this, sql, ...args);
      if (ret && typeof ret.catch === 'function') {
        return ret.catch(err => {
          throw annotateSql(err, sql, hasParams);
        });
      }

      return ret;
    };
  });
}

/**
 * Established tunnels by their config. db-migrate opens more than one
 * connection, which all share the tunnel listening on the local port.
 */
const tunnels = {};

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
      'config must include a driver key specifying which driver to use'
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
    driver.connect(
      // safe disconnect of our config object into userspace
      JSON.parse(JSON.stringify(config)),
      intern,
      function (err, db) {
        if (err) {
          callback(err);
          return;
        }
        log.verbose('connected');

        if (!global.immunity) {
          db = Shadow.infect(db, internals, ShadowProto);
        }

        trackSql(db);
        // the dialect of parameters in all, $1 instead of ? for pg
        db._dbmDriver = typeof config.driver === 'string' ? config.driver : null;
        callback(null, db);
      }
    );
  };

  if (config.tunnel) {
    // tunnels are provided by plugins, e.g. db-migrate-plugin-tunnel-ssh
    var tunnelConfig = JSON.parse(JSON.stringify(config.tunnel));
    const { tunnelType } = tunnelConfig;
    const type = tunnelType && tunnelType !== 'ssh' ? tunnelType : 'ssh';
    const hook = `connection:tunnel:${type}`;

    if (plugins) {
      plugin = plugins.overwrite(hook);
    }

    if (!plugin) {
      return callback(
        new Error(
          `A ${type} tunnel is configured, but no plugin provides it. ` +
            `Install db-migrate-plugin-tunnel-${type}, e.g. ` +
            `npm install db-migrate-plugin-tunnel-${type}`
        )
      );
    }

    tunnelConfig.dstHost = config.host;
    tunnelConfig.dstPort = config.port;

    // Point the db host/port to our local tunnel, on a copy as the config
    // is used again for further connections
    config = Object.assign({}, config, {
      host: '127.0.0.1',
      port: tunnelConfig.localPort
    });

    const key = JSON.stringify([type, tunnelConfig]);
    if (!tunnels[key]) {
      tunnels[key] = Promise.resolve().then(() => plugin[hook](tunnelConfig));
      // a failed tunnel may be retried
      tunnels[key].catch(() => delete tunnels[key]);
    }

    tunnels[key]
      .then(
        function () {
          log.verbose(`${type} tunnel connected on port`, tunnelConfig.localPort);
          connect(config);
        },
        function (err) {
          callback(err);
        }
      );
  } else {
    connect(config);
  }
};
