'use strict';

var assert = require('assert');
var path = require('path');
var log = require('db-migrate-shared').log;
var _assert = require('./helper/assert');

function executeUndoSeed (internals, config, callback) {
  var index = require('./connect');
  var Seeder = require('./lib/seeder.js');

  if (!internals.argv.count) {
    log.info('Defaulting to running 1 down seed.');
    internals.argv.count = 1;
  }

  if (internals.argv._.length > 0) {
    internals.argv.destination = internals.argv._.shift().toString();
  }

  index.connect(
    {
      config: config.getCurrent().settings,
      internals: internals
    },
    Seeder,
    function (err, seeder) {
      assert.ifError(err);

      var seedDir =
        internals.mode !== 'static' ? 'vcseeder-dir' : 'staticseeder-dir';

      seeder.seedDir = path.resolve(internals.argv[seedDir]);

      if (internals.mode === 'static') {
        internals.onComplete(seeder, callback, {
          stack: "Static seeders can't be undone. Use VC Seeders instead!"
        });
      } else {
        seeder.createSeedsTable(function (err) {
          if (_assert(err, callback)) {
            seeder.down(
              internals.argv,
              internals.onComplete.bind(this, seeder, internals, callback)
            );
          }
        });
      }
    }
  );
}

module.exports = executeUndoSeed;
