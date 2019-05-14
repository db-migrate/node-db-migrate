var Code = require('code');
var Lab = require('lab');
var lab = (exports.lab = Lab.script());
var onComplete = require('../lib/commands/on-complete');

lab.experiment('on-complete', function () {
  lab.test('should return a promise with the results', async function () {
    var migratorMock = {
      driver: {
        close: function (cb) {
          cb();
        }
      }
    };
    var internalsMock = {
      argv: {}
    };

    var resultsPassedToCallback = 'callback should be invoked with results';
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
});
