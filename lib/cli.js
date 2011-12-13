var Migration = require('./migration');

exports.create = function(options) {
  var migration = new Migration(options.title);
  migration.write(function(err) {
    if (err) {
      console.error('[FAILED]', err);
    } else {
      console.log('[SUCCESS]', util.format('Created migration at %s', migration.path));
    }
  });
};

exports.up = function(options) {

};

exports.down = function(options) {

};
