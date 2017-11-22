var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var util = require('db-migrate-shared').util;

lab.experiment('util', { parallel: true }, function () {
  lab.experiment('lpad', { parallel: true }, lpad);
});

function lpad () {
  lab.test('should left pad the number of characters to equal the total length',
    { parallel: true }, function (done) {
      var actual = util.lpad('prompt', '>', 8);
      Code.expect(actual).to.equal('>>prompt');

      done();
    });

  lab.test('should apply no left padding if already equal to the total length',
    { parallel: true }, function (done) {
      var actual = util.lpad('>>prompt', '>', 8);
      Code.expect(actual).to.equal('>>prompt');

      done();
    });

  lab.test('should apply no left padding if already greater than the total ' +
   'length', { parallel: true }, function (done) {
    var actual = util.lpad('>>>prompt', '>', 8);
    Code.expect(actual).to.equal('>>>prompt');

    done();
  });

  lab.test('should be apple to pad numbers',
    { parallel: true }, function (done) {
      var actual = util.lpad(12, '>', 4);
      Code.expect(actual).to.equal('>>12');

      done();
    });

  lab.test('should be apple to pad using numbers',
    { parallel: true }, function (done) {
      var actual = util.lpad(12, 0, 4);
      Code.expect(actual).to.equal('0012');

      done();
    });
}
