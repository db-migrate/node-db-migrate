var vows = require('vows');
var assert = require('assert');
var Base = require('../../lib/driver/base');

var internals = {};
internals.migrationTable = 'migrations';

vows.describe('base').addBatch({
  'default implementation': {
    topic: new Base(internals),

    'inherits from EventEmitter': function(base) {
      assert.isNotNull(base.on);
      assert.isNotNull(base.emit);
    },

    'throws errors for all API methods': function(base) {
      assert.throws(function() {
        base.createTable();
      }, Error);

      assert.throws(function() {
        base.dropTable();
      }, Error);

      assert.throws(function() {
        base.addColumn();
      }, Error);

      assert.throws(function() {
        base.removeColumn();
      }, Error);

      assert.throws(function() {
        base.renameColumn();
      }, Error);

      assert.throws(function() {
        base.changeColumn();
      }, Error);

      assert.throws(function() {
        base.addIndex();
      }, Error);

      assert.throws(function() {
        base.insert();
      }, Error);

      assert.throws(function() {
        base.removeIndex();
      }, Error);

      assert.throws(function() {
        base.addAssociation();
      }, Error);

      assert.throws(function() {
        base.removeAssociation();
      }, Error);

      assert.throws(function() {
        base.addForeignKey();
      }, Error);

      assert.throws(function() {
        base.removeForeignKey();
      }, Error);

      assert.throws(function() {
        base.runSql();
      }, Error);
    },

    'escapes single quotes': function(base) {
      assert.equal("Bill''s Mother''s House", base.escape("Bill's Mother's House"));
    }
  }
}).export(module);

