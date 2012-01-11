var vows = require('vows');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var fsext = require('../helper/fsext');
var dbmUtil = require('../../lib/util');


function wipeMigrations(callback) {
  var dir = path.join(__dirname, 'migrations');
  fsext.rm_r(dir, callback);
}

function dbMigrate() {
  var args = dbmUtil.toArray(arguments);
  var dbm = path.join(__dirname, '..', '..', 'bin', 'db-migrate');
  args.unshift(dbm);
  return cp.spawn('node', args, { cwd: __dirname });
}

vows.describe('create').addBatch({
  'without a migration directory': {
    topic: function() {
      wipeMigrations(function(err) {
        assert.isNull(err);
        dbMigrate('create', 'first migration').on('exit', this.callback);
      }.bind(this));
    },

    'does not cause an error': function(code) {
      assert.isNull(code);
    },

    'will create a new migration directory': function(code) {
      fs.stat(path.join(__dirname, 'migrations'), function(err, stats) {
        assert.isNull(err);
        assert.isTrue(stats.isDirectory());
      });
    },

    'will create a new migration': function(code) {
      fs.readdir(path.join(__dirname, 'migrations'), function(err, files) {
        assert.isNull(err);
        assert.isEqual(files.length, 1);
        assert.match(file, /first-migration\.js$/);

        var migration = require(path.join(__dirname, 'migrations', file));
        assert.isNotNull(migration.up);
        assert.isNotNull(migration.down);
      });
    }
  }
}).export(module);
