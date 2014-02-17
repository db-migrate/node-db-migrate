this.isSilent = false

exports.silence = function (isSilent) {
  return this.isSilent = isSilent;
};
exports.info = function () {
  if (!this.isSilent || global.verbose) {
    Array.prototype.unshift.call(arguments, '[INFO]');
    console.info.apply(console, arguments);
  }
};
exports.warn = function () {
  if (!this.isSilent || global.verbose) {
    var args = Array.prototype.unshift.call(arguments, '[WARN]');
    console.warn.apply(console, arguments);
  }
};
exports.error = function () {
  if (!this.isSilent || global.verbose) {
    var args = Array.prototype.unshift.call(arguments, '[ERROR]');
    console.error.apply(console, arguments);
  }
};
exports.sql = function(sql) {
  if (!this.isSilent && (global.dryRun || global.verbose)) {
    var args = Array.prototype.slice.call(arguments).slice(1);
    args = args.slice(0, args.length - 1);
    if(global.verbose) {
      if(args.length > 0) {
        console.log('[SQL]', sql, args);
      } else {
        console.log('[SQL]', sql);
      }
    }
    if (global.dryRun) {
      if(args.length > 0) {
        console.log(sql, args);
      } else {
        console.log(sql);
      }
    }
  }
};
exports.verbose = function() {
  if (global.verbose) {
    Array.prototype.unshift.call(arguments, '[INFO]');
    console.log.apply(console, arguments);
  }
};
