var vows = require('vows');
var assert = require('assert');
var util = require('util');
var fs = require('fs');
var lpad = require('../lib/util').lpad;
var inflection = require('../lib/inflection');
var Migration = require('../lib/migration');

vows.describe('create').addBatch({
  'create new migration': {
    topic: function() {
      return new Migration("first migration", new Date());
    },

    'should provide the path to the created migration': function(migration) {
      assert.isNotNull(migration.path);
    },

    'should exist': function(migration) {
      assert.isNotNull(migration);
    },

    'should provide the date of the migration': function(migration) {
      assert.isNotNull(migration.date);
      assert.instanceOf(migration.date, Date);
    },

    'should format the migration name': function(migration) {
      var date = migration.date;
      var dateStr = [
        date.getUTCFullYear(),
        lpad(date.getUTCMonth() + 1, '0', 2),
        lpad(date.getUTCDate(), '0', 2),
        lpad(date.getUTCHours(), '0', 2),
        lpad(date.getUTCMinutes(), '0', 2),
        lpad(date.getUTCSeconds(), '0', 2)
      ].join('');
      var migrationName = dateStr + '-' + inflection.dasherize(migration.title);
      assert.equal(migration.name, migrationName);
    },

    'file': {
      topic: function(migration) {
        migration.write(function() {
          fs.stat(migration.path, function(err, stat) {
            this.callback(migration, err, stat);
          }.bind(this));
        }.bind(this));
      },

      'exists': function(migration, err, stat) {
        assert.isNull(err);
        assert.isObject(stat);
      },

      'is not empty': function(migration, err, stat) {
        assert.isNotZero(stat.size);
      },

      'exports up and down functions': function(migration, err, stat) {
        var instance = require(migration.path);
        assert.isFunction(instance.up);
        assert.isFunction(instance.down);
      }
    },
  },

  'create migration with same name as existing one': {
    topic: function() {
      return new Migration("first migration", new Date());
    },

    //'migration file': {
      //topic: function(migration) {
        //fs.stat(migration.path, this.callback);
      //},

      //'exists': function(err, stat) {
        //assert.isNull(err);
        //assert.isObject(stat);
      //},

      //'is not empty': function(err, stat) {
        //assert.isNotZero(stat.size);
      //}
    //}
  }
}).export(module);
