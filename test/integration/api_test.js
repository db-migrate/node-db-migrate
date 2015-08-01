var vows = require('vows');
var assert = require('assert');
var fs = require('fs');
var dbmUtil = require('../../lib/util');
var DBMigrate = require('../../');
var path = require('path');
var cp = require('child_process');


var process_exit = process.exit,
    argv = process.argv;

function restore() {

  process.exit = process_exit;
  process.argv = argv;
}

vows.describe('api').addBatch({
  'force process exit': {
    topic: function() {

      process.argv = [ 'node', 'script' ];
      var called = false,
          self = this,
          config = { cwd: process.cwd() + '/test/integration' };

      var api = DBMigrate.getInstance(true, config);
      api.create( 'test', function( err ) {
        process.argv.push('up');

        process.exit = function(err) {

          var ret = called;
          called = true;

          process.exit = process_exit;

          if(err)
            process.exit.apply(arguments);

          if(!ret)
            this.callback(false);
        }.bind(this);

        var dbmigrate = DBMigrate.getInstance(true, config, function(migrator) {

          var ret = called;
          called = true;

          migrator.driver.close(function(err) {
            delete migrator.driver;
          });

          process.exit = process_exit;

          if(!ret)
            this.callback(true);
        }.bind(this));

        dbmigrate.setConfigParam('force-exit', true);
        dbmigrate.silence(true);


        dbmigrate.run();
      }.bind( this ) );
    },

    teardown: function() {

      restore();
      cp.exec('rm -r ' + path.join(__dirname, 'migrations'), this.callback);
    },

    'process exited after migrations have been run': function(called) {

      assert.isTrue(called);
    }
  }
}).export(module);
