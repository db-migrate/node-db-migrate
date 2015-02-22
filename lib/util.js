
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
