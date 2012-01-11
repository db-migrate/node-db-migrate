var vows = require('vows');
var assert = require('assert');
//var sqlite3 = require('sqlite3');
var dbInfo = require('db-info');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

vows.describe('sqlite3').addBatch({
  'createTable': {
    topic: function() {
      driver.connect({driver: 'sqlite3', filename: ':memory:'}, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          str: { type: dataType.STRING, unique: true },
          txt: { type: dataType.TEXT, notNull: true, defaultValue: "foo" },
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME
        }, this.callback.bind(this, null, db));
      }.bind(this));
    },

    'has resulting table': {
      topic: function(db) {
        dbInfo.getInfo({db: db.connection, driver: 'sqlite3'}, this.callback);
      },

      'with 6 columns': function(err, info) {
        assert.isNotNull(info);
        var count = 0;
        for (var column in info.tables.event.columns) { count++ }
        assert.equal(count, 6);
      },

      'that has integer id column that is primary key, non-nullable, and auto increments': function(err, info) {
        assert.equal(info.tables.event.columns.id.type, 'integer');
        assert.equal(info.tables.event.columns.id.primaryKey, true);
        assert.equal(info.tables.event.columns.id.notNull, true);
        assert.equal(info.tables.event.columns.id.autoIncrement, true);
      },

      'that has text str column that is unique': function(err, info) {
        assert.equal(info.tables.event.columns.str.type, 'text');
        assert.equal(info.tables.event.columns.str.unique, true);
      },

      'that has text txt column that is non-nullable': function(err, info) {
        assert.equal(info.tables.event.columns.txt.type, 'text');
        assert.equal(info.tables.event.columns.txt.notNull, true);
        assert.equal(info.tables.event.columns.txt.defaultValue, 'foo');
      },

      'that has integer intg column': function(err, info) {
        assert.equal(info.tables.event.columns.intg.type, 'integer');
      },

      'that has real rel column': function(err, info) {
        assert.equal(info.tables.event.columns.rel.type, 'real');
      },

      'that has integer dt column': function(err, info) {
        assert.equal(info.tables.event.columns.dt.type, 'integer');
      },
    }
  },

  'dropTable': {
    topic: function() {
      driver.connect({driver: 'sqlite3', filename: ':memory:'}, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
        }, function() {
          db.dropTable('event', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    'has resulting table': {
      topic: function(db) {
        dbInfo.getInfo({db: db.connection, driver: 'sqlite3'}, this.callback);
      },

      'that no longer exists': function(err, info) {
        assert.isNotNull(info);
        assert.isUndefined(info.tables.event);
      }
    }
  },

  'renameTable': {
    topic: function() {
      driver.connect({driver: 'sqlite3', filename: ':memory:'}, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
        }, function() {
          db.renameTable('event', 'functions', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    'has resulting table': {
      topic: function(db) {
        dbInfo.getInfo({db: db.connection, driver: 'sqlite3'}, this.callback);
      },

      'that has been renamed': function(err, info) {
        assert.isNotNull(info);
        assert.isUndefined(info.tables.event);
        assert.isDefined(info.tables.functions);
      }
    }
  },

  'addColumn': {
    topic: function() {
      driver.connect({driver: 'sqlite3', filename: ':memory:'}, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
        }, function() {
          db.addColumn('event', 'title', 'string', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    'has resulting column': {
      topic: function(db) {
        dbInfo.getInfo({db: db.connection, driver: 'sqlite3'}, this.callback);
      },

      'with additional column': function(err, info) {
        assert.isNotNull(info);
        assert.isDefined(info.tables.event.columns.title);
        assert.equal(info.tables.event.columns.title.type, 'text');
      }
    }
  },

  'addIndex': {
    topic: function() {
      driver.connect({driver: 'sqlite3', filename: ':memory:'}, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING },
        }, function() {
          db.addIndex('event', 'event_title', 'title', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    'has resulting table': {
      topic: function(db) {
        dbInfo.getInfo({db: db.connection, driver: 'sqlite3'}, this.callback);
      },

      'with additional index': function(err, info) {
        assert.isNotNull(info);
        assert.isDefined(info.tables.event.indexes.event_title);
      }
    }
  },

  'removeIndex': {
    topic: function() {
      driver.connect({driver: 'sqlite3', filename: ':memory:'}, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
        }, function() {
          db.addIndex('event', 'event_title', 'title', function(err) {
            db.removeIndex('event_title', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    },

    'has resulting table': {
      topic: function(db) {
        dbInfo.getInfo({db: db.connection, driver: 'sqlite3'}, this.callback);
      },

      'without index': function(err, info) {
        assert.isNotNull(info);
        assert.isUndefined(info.tables.event.indexes.event_title);
      }
    }
  }

}).export(module);
