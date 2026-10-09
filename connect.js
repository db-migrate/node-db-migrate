/**
 * This file is going to disappear.
 * Only still here for backwards compatibility.
 * */
var fs = require('fs');
var driver = require('./lib/driver');
var path = require('path');
var log = require('db-migrate-shared').log;
var resolveEnv = require('./lib/config').resolveEnv;
const Promise = require('bluebird');

Promise.promisifyAll(driver);

/**
 * The config.json of a scope, with { "ENV": ... } resolved, or null.
 */
function scopeConfig (dirPath, scope) {
  const file = path.resolve(dirPath, scope, 'config.json');

  if (!fs.existsSync(file)) {
    return null;
  }

  log.info('loaded extra config for migration subfolder: "' + scope + '/config.json"');
  return resolveEnv(JSON.parse(fs.readFileSync(file, 'utf8')));
}

/**
 * A scope config with more than database or schema connects on its own,
 * inheriting the settings of the environment it does not set itself.
 */
const SWITCH_ONLY = ['database', 'schema'];
const ownConnection = conf =>
  Object.keys(conf).some(key => SWITCH_ONLY.indexOf(key) === -1);

exports.connect = async function (config, PassedClass) {
  var internals = {};
  var prefix = 'migration';
  if (config.config) {
    prefix = config.prefix || prefix;
    internals = config.internals;
    config = config.config;
  }

  const dirPath = path.resolve(internals.argv['migrations-dir'] || 'migrations');
  const scope = internals.migrationMode;
  const conf = scope ? scopeConfig(dirPath, scope) : null;
  let switchTo = null;

  if (conf && ownConnection(conf)) {
    // a database of its own, with its own migrations and state tables
    config = Object.assign({}, config, conf);
  } else if (conf && (conf.database || conf.schema)) {
    switchTo = conf;
  }

  const db2 = await driver.connectAsync(config, internals);
  const db = await driver.connectAsync(config, internals);

  const realClose = db.close;
  // close both lines with one disconnect action
  db.close = function (cb) {
    db2.close(function () {});
    db.close = realClose;
    db.close(cb);
  };

  if (switchTo) {
    // both lines, so the state is kept in the database of the scope as well
    await Promise.promisify(db.switchDatabase, { context: db })(switchTo);
    await Promise.promisify(db2.switchDatabase, { context: db2 })(switchTo);
  }

  if (scope) {
    internals.locTitle = scope;
  }

  return new PassedClass(
    db,
    dirPath,
    internals.mode !== 'static',
    internals,
    prefix,
    { db2 }
  );
};

exports.driver = function (config, callback) {
  var internals = {};
  if (config.config) {
    internals = config.internals;
    config = config.config;
  }

  driver.connect(config, internals, callback);
};
