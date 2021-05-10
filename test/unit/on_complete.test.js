'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const onComplete = require('../../lib/commands/on-complete');

lab.experiment('on-complete', () => {
  const internalsMock = {
    argv: {}
  };

  lab.test('with success should return a promise with the results', async () => {
    const resultsPassedToCallback = 'callback should be invoked with results';
    const migratorMock = {
      driver: {
        close: function (cb) {
          cb();
        }
      }
    };

    const { err, res } = await onComplete(
      migratorMock,
      internalsMock,
      null,
      resultsPassedToCallback
    )
      .then(res => ({ res }))
      .catch(err => ({ err }));

    Code.expect(err).to.equal(undefined);
    Code.expect(res).to.equal(resultsPassedToCallback);
  });

  lab.test('with callback error should return a promise with error', async () => {
    const resultsPassedToCallback = 'callback should be invoked with results';
    const error = 'some error';
    const migratorMock = {
      driver: {
        close: function (cb) {
          cb(error);
        }
      }
    };

    const { err, res } = await onComplete(
      migratorMock,
      internalsMock,
      null,
      resultsPassedToCallback
    )
      .then(res => ({ res }))
      .catch(err => ({ err }));

    Code.expect(err).to.be.error(error);
    Code.expect(res).to.equal(undefined);
  });

  lab.test(
    'with passed error should return a promise with error',
    async () => {
      const resultsPassedToCallback = 'callback should be invoked with results';
      const error = 'some error';
      const migratorMock = {
        driver: {
          close: function (cb) {
            cb();
          }
        }
      };

      const { err, res } = await onComplete(
        migratorMock,
        internalsMock,
        new Error(error),
        resultsPassedToCallback
      )
        .then((res) => ({ res }))
        .catch((err) => ({ err }));

      Code.expect(err).to.be.error(error);
      Code.expect(res).to.equal(undefined);
    }
  );
});
