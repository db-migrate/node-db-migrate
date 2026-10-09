'use strict';

const Promise = require('bluebird');
const maybePromised = require('../../temputils.js').maybePromised;
const log = require('db-migrate-shared').log;

/**
 * A migration runs inside a transaction of the driver, unless it opts out
 * with _meta.transactions = false, e.g. for statements which can not run
 * inside one, like CREATE INDEX CONCURRENTLY of PostgreSQL.
 */
const transactional = file => {
  const _meta = file.get()._meta || {};

  if (_meta.transactions === false) {
    log.verbose(`[migration] ${file.name} runs without a transaction`);
    return false;
  }

  return true;
};

const start = (driver, file) =>
  transactional(file) ? driver.startMigration() : Promise.resolve();

const end = (driver, file) =>
  transactional(file) ? driver.endMigration() : Promise.resolve();

const execUnit = {
  up: function (context, driver, file) {
    return start(context.driver, file)
      .then(() => {
        const _file = file.get();

        if (typeof _file.setup === 'function') {
          _file.setup(context.internals.safeOptions, context.seedLink);
        }

        return maybePromised(file, _file.up, [context.driver]);
      })
      .then(() => {
        return Promise.promisify(context.writeMigrationRecord.bind(context))(
          file
        );
      })
      .then(() => end(context.driver, file));
  },

  down: function (context, driver, file) {
    return start(driver, file)
      .then(() => {
        const _file = file.get();

        if (typeof _file.setup === 'function') {
          _file.setup(context.internals.safeOptions, context.seedLink);
        }

        return maybePromised(file, _file.down, [context.driver]);
      })
      .then(() => {
        return Promise.promisify(context.deleteMigrationRecord.bind(context))(
          file
        );
      })
      .then(() => end(context.driver, file));
  }
};

module.exports = execUnit;
