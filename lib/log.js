exports.info = console.info.bind(console, '[INFO]');
exports.warn = console.warn.bind(console, '[WARN]');
exports.error = console.error.bind(console, '[ERROR]');
exports.verbose = function() {
  if (global.verbose) {
    console.log.bind(console, '[INFO]').apply(console, arguments);
  }
};
