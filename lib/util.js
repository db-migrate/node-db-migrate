var log = require('./log');

function isIncludedInUp(migration, destination) {
  if(!destination) {
    return true;
  }
  var migrationTest = migration.name.substring(0, Math.min(migration.name.length, destination.length));
  var destinationTest = destination.substring(0, Math.min(migration.name.length, destination.length));
  return migrationTest <= destinationTest;
}

exports.filterUp = function(allMigrations, completedMigrations, destination, count) {
  var sortFn = function(a, b) {
    return a.name.slice(0, a.name.indexOf('-')) - b.name.slice(0, b.name.indexOf('-'));
  };

  return allMigrations.sort(sortFn)
  .filter(function(migration) {
    var hasRun = completedMigrations.some(function(completedMigration) {
      return completedMigration.name === migration.name;
    });
    return !hasRun;
  })
  .filter(function(migration) {
    return isIncludedInUp(migration, destination);
  })
  .slice(0, count);
};

/**
  * Similar to the shadow driver, but we reduce to a subset of an existing
  * driver.
  */
exports.reduceToInterface = function(db, originInterface) {

  var Interface = {};
  Interface._original = {};

  //set to make it optional
  originInterface.exclude = originInterface.exclude || {};

  if( db._shadowsHost ) {

    Interface._shadowsHost = db._shadowsHost;
    Interface._shadowProto = db._shadowProto;
  }

  var origin = (typeof(originInterface) === 'function') ?
    originInterface.prototype : originInterface;

  for(var prop in db) {

    if( typeof(db[prop]) !== "function" &&
        originInterface.exclude[prop] === undefined ) {

      Interface[prop] = db[prop];
    }
  }

  for(var prop in origin) {

    if (typeof db[prop] === "function") {

      Interface[prop] = db[prop];
    }
    else if(typeof origin[prop] === "function") {

      Interface[prop] = origin[prop];
    }
  }

  for(var prop in originInterface.deprecated) {

    if (typeof db[prop] === "function" &&
        typeof originInterface.deprecated[prop] === "function") {

      Interface._original[prop] = db[prop];

      (function(property) {

        Interface[property] = function() {

          log.warn('This function "' + property
          + '" is deprecated and '
          + originInterface.deprecated[property + '_deprecation'] );

        return this._original[property].apply(this, arguments);
      };
      }(prop));
    }
    else if(typeof originInterface[prop] === "function") {

      Interface._original[prop] = originInterface[prop];

      (function(property) {

        Interface[property] = function() {

          log.warn('This function "' + property
          + '" is deprecated.' + "\n"
          + originInterface.deprecated[property + '_deprecation'] );

        return this._original[property].apply(this, arguments);
      };
      }(prop));
    }
  }

  for(var prop in originInterface.extending) {

    if (typeof db[prop] === 'function' &&
        typeof originInterface.extending[prop] === 'function') {

      Interface[prop] = db[prop];
    }
    else if(typeof originInterface.extending[prop] === 'function') {

      Interface[prop] = originInterface.extending[prop];
    }
  }

  return Interface;
};

exports.filterDown = function(completedMigrations, count) {
  return completedMigrations.slice(0, count);
};


exports.lpad = function(str, padChar, totalLength) {
  str = str.toString();
  var neededPadding = totalLength - str.length;
  for (var i = 0; i < neededPadding; i++) {
    str = padChar + str;
  }
  return str;
};

exports.shallowCopy = function(obj) {
  var newObj = {};
  for (var prop in obj) {
    newObj[prop] = obj[prop];
  }
  return newObj;
};

exports.toArray = function(obj) {
  var arr = [];
  for (var prop in obj) {
    arr[prop] = obj[prop];
  }
  return arr;
};

exports.isArray = function(obj) {
  return Object.prototype.toString.call(obj) == '[object Array]';
};

exports.isFunction = function(obj) {
  return typeof(obj) == 'function';
};

exports.isString = function(obj) {
  return typeof(obj) == 'string';
};
