'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const Promise = require('bluebird');
const v1 = require('../lib/executors/versioned/v1.js');

lab.experiment('v1 executor', function () {
  const run = async (direction, _meta) => {
    const calls = [];
    const driver = {
      startMigration: () => calls.push('start') && Promise.resolve(),
      endMigration: () => calls.push('end') && Promise.resolve()
    };
    const context = {
      driver,
      internals: { safeOptions: {} },
      writeMigrationRecord: (file, cb) => calls.push('record') && cb(),
      deleteMigrationRecord: (file, cb) => calls.push('record') && cb()
    };
    const file = {
      name: 'm1',
      get: () => ({
        _meta,
        up: () => calls.push('up') && Promise.resolve(),
        down: () => calls.push('down') && Promise.resolve()
      })
    };

    await v1[direction](context, driver, file);
    return calls;
  };

  lab.test('should run a migration inside a transaction', async () => {
    Code.expect(await run('up')).to.equal(['start', 'up', 'record', 'end']);
    Code.expect(await run('down', { version: 1 })).to.equal(['start', 'down', 'record', 'end']);
  });

  lab.test('should run a migration opting out without a transaction', async () => {
    Code.expect(await run('up', { transactions: false })).to.equal(['up', 'record']);
    Code.expect(await run('down', { transactions: false })).to.equal(['down', 'record']);
  });
});
