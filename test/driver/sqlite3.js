var vows = require('vows');
var assert = require('assert');
var sqlite3 = require('sqlite3');
var dataType = require('../../lib/data_type');

vows.describe('sqlite3').addBatch({
  'createTable': {
    topic: new sqlite3.Database(':memory:'),

    'using only column data types': {
      topic: function(db) {
        db.createTable('event', {
          str: dataType.STRING,
          txt: dataType.TEXT,
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME
        }, this.callback);
      },

      'creates a table with the given columns and data types': function(err, db) {
        assert.isNull(err);
      }
    },

    'with not null column constraint': {
      topic: function(db) {
        db.createTable('event', {
          str: dataType.STRING,
          txt: dataType.TEXT,
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME
        }, this.callback);
      },

      'creates a table with a non-nullible column': function(err, db) {
        assert.isNull(err);
      }
    }
  }
}).export(module);

