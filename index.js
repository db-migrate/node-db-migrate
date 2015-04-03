var pkginfo = require('pkginfo')(module, 'version');

exports.dataType = require('./lib/data_type');
module.exports = require( './api.js' );
