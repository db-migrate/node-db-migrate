var pkginfo = require('pkginfo')(module, 'version');

exports.dataType = require('./lib/data_type');


/**
 * Removes a module from the cache
 */
uncache = function (moduleName) {
    // Run over the cache looking for the files
    // loaded by the specified module name
    searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(moduleName)>0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

/**
 * Runs over the cache to search for all the cached
 * files
 */
searchCache = function (moduleName, callback) {
    // Resolve the module identified by the specified name
    var mod = require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        // Recursively go over the results
        (function run(mod) {
            // Go over each of the module's children and
            // run over it
            mod.children.forEach(function (child) {
                run(child);
            });

            // Call the specified callback providing the
            // found module
            callback(mod);
        })(mod);
    }
};

module.exports.getInstance = function(isModule, options, callback) {

  delete require.cache[require.resolve('./api.js')];
  delete require.cache[require.resolve('optimist')];
  var mod = require( './api.js' );
  return new mod(isModule, options, callback);
};
