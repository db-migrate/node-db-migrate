var vows = require('vows');
var assert = require('assert');
var config = require('../lib/config');
var path = require('path');

vows.describe('config').addBatch({
  'library': {
    topic: function() {
      var configPath = path.join(__dirname, 'database.json');
      config.load(configPath, 'dev');
      return config;
    },

    'should remove the load function': function (config) {
      assert.isUndefined(config.load);
    },

    'should export all environment settings': function (config) {
      assert.isDefined(config.dev);
      assert.isDefined(config.test);
      assert.isDefined(config.prod);
    },

    'should export a getCurrent function with all current environment settings': function (config) {
      assert.isDefined(config.getCurrent);
      var current = config.getCurrent();
      assert.equal(current.env, 'dev');
      assert.equal(current.settings.driver, 'sqlite3');
      assert.equal(current.settings.filename, ':memory:');
    }
  }
}).export(module);

