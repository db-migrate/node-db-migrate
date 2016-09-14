var Migration = require('../migration.js');
var tryRequire = require('./try-require.js');
var updateVersion = require('./update-version.js');
var ask = require('./ask.js');
var log = require('db-migrate-shared').log;

var internals = {
  migrationProtcol: 1,
  cwd: process.cwd()
};

ask(
  {
    properties: {
      safe: {
        description: 'This process is going to alter your migrations. We ' +
        'highly recommend you to backup your migrations or even better safe ' +
        'the current state with git versioning.\nPlease make sure you don\'t ' +
        'blow up yourself.\n\nDo you want to continue? [y/n]',
        message: 'Invalid answer! Do you want to continue? [y/n]',
        type: 'string',
        default: 'n',
        conform: function(value) {

          return value === 'y' || value === 'n';
        }
      }
    }
  }, function(err) {

  if(err)
    return;

  Migration.loadFromFilesystem('migrations/', internals,
    function(err, migrations) {

    migrations.forEach(function(migration) {

      var required = tryRequire(migration, internals);
      var version = (required._meta && required._meta.version) ?
      required._meta.version
      : 0;

      if(version !== internals.migrationProtcol) {

        var i;

        for(i = 0; i < internals.migrationProtocol; ++i) {

          var transition = require('./' + i + 1);
          updateVersion(required, migration, internals, i + 1);
        }
      }
      else {

        log.info(migration.name, 'was already transitioned to version ' +
        internals.migrationProtcol + '.');
      }
    });
  });
});
