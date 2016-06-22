var vows = require('vows');
var assert = require('assert');
var util = require('db-migrate-shared').util;

vows.describe('util').addBatch({
  'lpad': {
    'should left pad the number of characters to equal the total length': function() {
      var actual = util.lpad('prompt', '>', 8);
      assert.equal(actual, '>>prompt');
    },

    'should apply no left padding if already equal to the total length': function() {
      var actual = util.lpad('>>prompt', '>', 8);
      assert.equal(actual, '>>prompt');
    },

    'should apply no left padding if already greater than the total length': function() {
      var actual = util.lpad('>>>prompt', '>', 8);
      assert.equal(actual, '>>>prompt');
    },

    'should be apple to pad numbers': function() {
      var actual = util.lpad(12, '>', 4);
      assert.equal(actual, '>>12');
    },

    'should be apple to pad using numbers': function() {
      var actual = util.lpad(12, 0, 4);
      assert.equal(actual, '0012');
    }
  }
}).export(module);
