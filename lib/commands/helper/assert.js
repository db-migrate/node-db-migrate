var assert = require('assert');

module.exports = function (err, callback) {
  if (err) {
    if (typeof (callback) === 'function') {
      callback(err);
      return false;
    } else {
      assert.ifError(err);
      return false;
    }
  }

  return true;
};
