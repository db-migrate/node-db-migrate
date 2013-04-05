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
