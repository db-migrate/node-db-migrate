var pkginfo = require('pkginfo')(module, 'version'); // jshint ignore:line

exports.dataType = require('db-migrate-shared').dataType;

module.exports.getInstance = function(isModule, options, callback) {

  delete require.cache[require.resolve('./api.js')];
  delete require.cache[require.resolve('optimist')];
  var mod = require( './api.js' );
  return new mod(isModule, options, callback);
};
