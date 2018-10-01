var Code = require('code');
var Lab = require('lab');
var lab = (exports.lab = Lab.script());
var onComplete = require('../lib/commands/on-complete');

lab.experiment('on-complete', function () {
  lab.test('should invoke the callback with the results', function (done) {
    var migratorMock = {
      driver: {
        close: function (cb) {
          cb();
        }
      }
    };
    var internalsMock = {
      argv: { }
    };

    var resultsPassedToCallback = 'callback should be invoked with results';
    var testCallback = function (err, res) {
      Code.expect(err).to.equal(null);
      Code.expect(res).to.equal(resultsPassedToCallback);
      done();
    };
    onComplete(migratorMock, internalsMock, testCallback, null, resultsPassedToCallback);
  });
});
