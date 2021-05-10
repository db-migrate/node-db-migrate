'use strict';

//#region Imports
var Code = require('@hapi/code');
var Lab = require('@hapi/lab');
var lab = (exports.lab = Lab.script());
var util = require('db-migrate-shared').util;
//#endregion

// Tests
lab.experiment('util', () => {
  lab.experiment('lpad', () => {
    lab.test('should left pad the number of characters to equal the total length', () => {
      var actual = util.lpad('prompt', '>', 8);
      Code.expect(actual).to.equal('>>prompt');
    });

    lab.test('should apply no left padding if already equal to the total length', () => {
      var actual = util.lpad('>>prompt', '>', 8);
      Code.expect(actual).to.equal('>>prompt');
    });

    lab.test('should apply no left padding if already greater than the total length', () => {
      var actual = util.lpad('>>>prompt', '>', 8);
      Code.expect(actual).to.equal('>>>prompt');
    });

    lab.test('should be apple to pad numbers', () => {
      var actual = util.lpad(12, '>', 4);
      Code.expect(actual).to.equal('>>12');
    });

    lab.test('should be apple to pad using numbers', () => {
      var actual = util.lpad(12, 0, 4);
      Code.expect(actual).to.equal('0012');
    });
  });
});
