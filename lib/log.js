exports.info = console.info.bind(console, '[INFO]');
exports.warn = console.warn.bind(console, '[WARN]');
exports.error = console.error.bind(console, '[ERROR]');
exports.sql = function(sql) {
  if (global.dryRun || global.verbose) {
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
    console.log.bind(console, '[INFO]').apply(console, arguments);
  }
};
