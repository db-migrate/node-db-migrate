var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

var config = require('../db.config.json').mongodb;

var internals = {};
internals.migrationTable = 'migrations';

var dbName = config.database;
driver.connect(config, internals, function(err, db) {
  assert.isNull(err);
  vows.describe('mongodb')
  .addBatch({
    'createCollection': {
      topic: function() {
        db.createCollection('event', this.callback);
      },

      teardown: function() {
        db.dropCollection('event', this.callback);
      },

      'has table metadata': {
        topic: function() {
          db._getCollectionNames(this.callback);
        },

        'containing the event table': function(err, tables) {
          assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
        }
      }
    }
  })
  .addBatch({
    'dropCollection': {
      topic: function() {
        db.createCollection('event', function(err, collection) {
          if(err) {
            return this.callback(err);
          }

          db.dropCollection('event', this.callback);
        }.bind(this));
      },

      'has table metadata': {
        topic: function() {
          db._getCollectionNames(this.callback);
        },

        'containing no tables': function(err, tables) {
          assert.isNotNull(tables);
          assert.equal(tables.length, 1);	// Should be 1 b/c of the system collection
        }
      }
    }
  })
  .addBatch({
    'renameCollection': {
      topic: function() {
        db.createCollection('event', function(err, collection) {
          if(err) {
            return this.callback(err);
          }

          db.renameCollection('event', 'functions', this.callback);
        }.bind(this));
      },

      teardown: function() {
        db.dropCollection('functions', this.callback);
      },


      'has table metadata': {
        topic: function() {
          db._getCollectionNames(this.callback);
        },

        'containing the functions table': function(err, tables) {
          assert.isNotNull(tables);
          assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
          assert.equal(tables[1].collectionName, 'functions');
        }
      }
    }
  })
  .addBatch({
    'addIndex': {
      topic: function() {
        db.createCollection('event', function(err, collection) {
          if(err) {
            return this.callback(err);
          }

          db.addIndex('event', 'event_title', 'title', false, this.callback);
        }.bind(this));
      },

      teardown: function() {
        db.dropCollection('event', this.callback);
      },

      'preserves case': {
        topic: function() {
          db._getCollectionNames(this.callback);
        },

        'of the functions original table': function(err, tables) {
          assert.isNotNull(tables);
          assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
          assert.equal(tables[1].collectionName, 'event');
        }
      },

      'has resulting index metadata': {
        topic: function() {
          db._getIndexes('event', this.callback);
        },

        'with additional index': function(err, indexes) {
          assert.isDefined(indexes);
          assert.isNotNull(indexes);
          assert.include(indexes, 'event_title');
        }
      }
    }
  })
  .addBatch({
    'insert': {
      topic: function() {
        db.createCollection('event', function(err, collection) {
          if(err) {
            return this.callback(err);
          }
          db.insert('event', [{id: 2, title: 'title'}], function(err) {

              if(err) {

                return this.callback(err);
              }

              db._find('event', {title: 'title'}, this.callback);

          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropCollection('event', this.callback);
      },

      'with additional row' : function(err, data) {

        assert.equal(data.length, 1);
      }
    }
  })
  .addBatch({
    'removeIndex': {
      topic: function() {
        db.createCollection('event', function(err, collection) {
          if(err) {
            return this.callback(err);
          }

          db.addIndex('event', 'event_title', 'title', false, function(err, data) {

            if(err) {
              return this.callback(err);
            }

            db.removeIndex('event', 'event_title', this.callback);
          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropCollection('event', this.callback);
      },


      'has resulting index metadata': {
        topic: function() {
          db._getIndexes('event', this.callback);
        },

        'without index': function(err, indexes) {
          if(err) {
            return this.callback(err);
          }

          assert.isDefined(indexes);
          assert.isNotNull(indexes);
          assert.notInclude(indexes, 'event_title');
        }
      }
    }
  })
  .addBatch({
    'createMigrationsTable': {
      topic: function() {
        db._createMigrationsCollection(this.callback);
      },

      teardown: function() {
        db.dropCollection('migrations', this.callback);
      },

      'has migrations table': {
        topic: function() {
          db._getCollectionNames(this.callback);
        },

        'has migrations table' : function(err, tables) {
          assert.isNull(err);
          assert.isNotNull(tables);
          assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
          assert.equal(tables[1].collectionName, 'migrations');
        }
      }
    }
  })
  .addBatch({
    'removeIndex': {
      topic: function() {
        db.createCollection('event', function(err, collection) {
          if(err) {
            return this.callback(err);
          }

          db.addIndex('event', 'event_title', 'title', false, function(err, data) {

            if(err) {
              return this.callback(err);
            }

            db.removeIndex('event', 'event_title', this.callback);
          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropCollection('event', this.callback);
      },


      'has resulting index metadata': {
        topic: function() {
          db._getIndexes('event', this.callback);
        },

        'without index': function(err, indexes) {
          if(err) {
            return this.callback(err);
          }

          assert.isDefined(indexes);
          assert.isNotNull(indexes);
          assert.notInclude(indexes, 'event_title');
        }
      }
    }
  })
  .addBatch({
    'createMigrationsTable': {
      topic: function() {
        db._createMigrationsCollection(this.callback);
      },

      teardown: function() {
        db.dropCollection('migrations', this.callback);
      },

      'has migrations table': {
        topic: function() {
          db._getCollectionNames(this.callback);
        },

        'has migrations table' : function(err, tables) {
          assert.isNull(err);
          assert.isNotNull(tables);
          assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
          assert.equal(tables[1].collectionName, 'migrations');
        }
      }
    }
  })
 .export(module);
});

