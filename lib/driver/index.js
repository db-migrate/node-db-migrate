var myUtil = require('../util');

function wrapFunction(driver, funcName) {
  var oldFunc = driver[funcName];
  driver[funcName] = function() {
    driver.emit('start');
    var callback = arguments[arguments.length - 1];
    var newArgs = myUtil.toArray(arguments);
    if (typeof(callback) === 'function') {
      var origArgs = arguments;
      newArgs[arguments.length - 1] = function(err) {
        if (err) {
          driver.emit('error', err);
        }
        callback.apply(driver, origArgs);
        driver.emit('end');
      };
    } else {
      newArgs.push(function(err) {
        if (err) {
          driver.emit('error', err);
        }
        driver.emit('end');
      });
    }

    oldFunc.apply(driver, newArgs);
  };
}

function wrap(driver) {
  ['createTable',
   'dropTable',
   'renameTable',
   'addColumn',
   'removeColumn',
   'renameColumn',
   'changeColumn',
   'addIndex',
   'removeIndex',
   'skip'
  ].forEach(function(func) {
    wrapFunction(driver, func);
  });
}

exports.connect = function(config, callback) {
  var driver = require('./' + config.driver);
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }
    wrap(db);
    callback(null, db);
  });
};
