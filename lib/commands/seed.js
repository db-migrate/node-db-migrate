'use strict';

var assert = require('assert');
var _assert = require('./helper/assert');

function executeSeed(internals, config, callback) {
  var index = require('./connect');
  var Seeder = require('./lib/seeder.js');

  if (internals.argv._.length > 0) {
    internals.argv.destination = internals.argv._.shift().toString();
  }

  index.connect(
    {
      config: config.getCurrent().settings,
      internals: internals
    },
    Seeder,
    function(err, seeder) {
      assert.ifError(err);

      seeder.seedDir = path.resolve(
        internals.argv[
          internals.mode !== 'static' ? 'vcseeder-dir' : 'staticseeder-dir'
        ]
      );

      if (internals.mode === 'static') {
        seeder.seed(
          internals.argv,
          internals.onComplete.bind(this, seeder, internals, callback)
        );
      } else {
        seeder.createSeedsTable(function(err) {
          if (_assert(err, callback)) {
            seeder.seed(
              internals.argv,
              internals.onComplete.bind(this, seeder, internals, callback)
            );
          }
        });
      }
    }
  );
}

module.exports = executeSeed;
