'use strict';

const log = require('db-migrate-shared').log;

function loadConfig (config, internals) {
  let out;
  const currentEnv = internals.currentEnv || internals.argv.env;

  if (internals.configObject) {
    out = config.loadObject(internals.configObject, currentEnv);
  } else {
    out = config.loadFile(internals.argv.config, currentEnv, internals.plugins);
  }

  if (internals.verbose) {
    const current = out.getCurrent();
    const s = JSON.parse(JSON.stringify(current.settings));

    if (s.password) {
      s.password = '******';
    }

    log.info('Using', current.env, 'settings:', s);
  }

  return out;
}

module.exports = loadConfig;
