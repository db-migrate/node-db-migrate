var Migration = require('../migration.js');
var tryRequire = require('./try-require.js');
var updateVersion = require('./update-version.js');
var ask = require('./ask.js');
var log = require('db-migrate-shared').log;

module.exports = function (internals) {
  ask(
    {
      properties: {
        safe: {
          description:
            'This process is going to alter your migrations. We ' +
            'highly recommend you to backup your migrations or even better safe ' +
            "the current state with git versioning.\nPlease make sure you don't " +
            'blow up yourself.\n\nDo you want to continue? [y/n]',
          message: 'Invalid answer! Do you want to continue? [y/n]',
          type: 'string',
          default: 'n',
          conform: function (value) {
            return value === 'y' || value === 'n';
          }
        }
      }
    },
    function (err) {
      if (err) {
        return;
      }

      internals.parser = {
        filesRegEx: /\.js$/
      };

      Migration.loadFromFilesystem('migrations/', internals, function (
        err,
        migrations
      ) {
        var messages = [];
        if (err) {
          return;
        }

        migrations.forEach(function (migration) {
          var required = tryRequire(migration, internals);
          var version =
            required._meta && required._meta.version
              ? required._meta.version
              : 0;

          if (version !== internals.migrationProtocol) {
            var i;

            for (i = 0; i < internals.migrationProtocol; ++i) {
              var transition = require('./' + (i + 1));
              transition.transition();
              messages[i + 1] = transition.message;

              updateVersion(required, migration, internals, i + 1);
              log.info('Transitioned ' + migration.name + '.');
            }
          } else {
            log.verbose(
              migration.name,
              'was already transitioned to version ' +
                internals.migrationProtocol +
                '.'
            );
          }
        });

        messages.forEach(function (message) {
          message();
        });
      });
    }
  );
};
