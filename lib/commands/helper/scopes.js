'use strict';

const fs = require('fs');
const path = require('path');
const log = require('db-migrate-shared').log;

/**
 * The scopes below a migrations directory, nested ones as "a/b". Folders
 * named sqls hold the files of sql-file migrations, they are no scopes.
 */
function listScopes (dir, prefix = '') {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'sqls')
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce((scopes, entry) => {
      const scope = prefix + entry.name;
      return scopes.concat(
        scope,
        listScopes(path.join(dir, entry.name), scope + '/')
      );
    }, []);
}

/**
 * Runs a command for its scope, or with the scope "all" once for the
 * migrations directory itself and once for every scope, one after another.
 * The results of all scopes are returned together.
 */
module.exports = async function eachScope (internals, run) {
  if (internals.migrationMode !== 'all') {
    return run();
  }

  const dir = path.resolve(internals.argv['migrations-dir'] || 'migrations');
  const scopes = [''].concat(listScopes(dir));
  const forceExit = internals.argv['force-exit'];
  let results = [];

  try {
    for (let i = 0; i < scopes.length; ++i) {
      const scope = scopes[i];
      log.info('Enter scope "' + (scope || '/') + '"');

      internals.migrationMode = scope || undefined;
      internals.matching = scope;
      internals.locTitle = undefined;
      // exiting is only up to the last scope
      internals.argv['force-exit'] = forceExit && i === scopes.length - 1;

      const result = await run();
      results = results.concat(result === undefined ? [] : result);
    }
  } finally {
    internals.migrationMode = 'all';
    internals.argv['force-exit'] = forceExit;
  }

  return results;
};
