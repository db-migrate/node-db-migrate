var fs = require('fs');
var path = require('path');
var inflection = require('./inflection');
var lpad = require('./util').lpad;
var config = require('./config');
var log = require('./log');

var filesRegEx = /\.js$/;
var coffeeSupported = false;
var coffeeModule = null;
try {
  coffeeModule = require('coffee-script');
  if (coffeeModule && coffeeModule.register) coffeeModule.register();
  coffeeSupported = true;
  filesRegEx = /\.(js|coffee)$/;
} catch (e) {}

Seed = function () {

};

Seed.prototype = {

};