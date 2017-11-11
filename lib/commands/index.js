'use strict';

var path = require('path');

function register (module) {
  return require(path.resolve(__dirname, module));
}

module.exports = register;
