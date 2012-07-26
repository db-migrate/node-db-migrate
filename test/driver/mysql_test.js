var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

vows.describe('mysql').addBatch({
  'createTable': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        if (err) { return this.callback(err); }
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          str: { type: dataType.STRING, unique: true, defaultValue: 'foo' },
          txt: { type: dataType.TEXT, notNull: true },
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME
        }, this.callback.bind(this, null, db));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'has table metadata': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getTables(this.callback);
        }.bind(this));
      },

      'containing the event table': function(err, tables) {
        assert.equal(tables.length, 1);
        assert.equal(tables[0].getName(), 'event');
      }
    },

    'has column metadata for the event table': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getColumns('event', this.callback);
        }.bind(this));
      },

      'with 6 columns': function(err, columns) {
        assert.isNotNull(columns);
        assert.equal(columns.length, 6);
      },

      'that has integer id column that is primary key, non-nullable, and auto increments': function(err, columns) {
        var column = findByName(columns, 'id');
        assert.equal(column.getDataType(), 'INT');
        assert.equal(column.isPrimaryKey(), true);
        assert.equal(column.isNullable(), false);
//        assert.equal(column.isAutoIncrementing(), true);
      },

      'that has text str column that is unique and has a default value': function(err, columns) {
        var column = findByName(columns, 'str');
        assert.equal(column.getDataType(), 'VARCHAR');
        assert.equal(column.getDefaultValue(), 'foo');
//        assert.equal(column.isUnique(), true);
      },

      'that has text txt column that is non-nullable': function(err, columns) {
        var column = findByName(columns, 'txt');
        assert.equal(column.getDataType(), 'TEXT');
        assert.equal(column.isNullable(), false);
      },

      'that has integer intg column': function(err, columns) {
        var column = findByName(columns, 'intg');
        assert.equal(column.getDataType(), 'INT');
        assert.equal(column.isNullable(), true);
      },

      'that has real rel column': function(err, columns) {
        var column = findByName(columns, 'rel');
        assert.equal(column.getDataType(), 'DOUBLE');
        assert.equal(column.isNullable(), true);
      },

      'that has integer dt column': function(err, columns) {
        var column = findByName(columns, 'dt');
        assert.equal(column.getDataType(), 'INT');
        assert.equal(column.isNullable(), true);
      }
    }
  }
}).addBatch({
  'dropTable': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function(err) {
          if (err) {
            return this.callback(err);
          }
          db.dropTable('event', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    'has table metadata': {
      topic: function() {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getTables(this.callback);
        }.bind(this));
      },

      'containing no tables': function(err, tables) {
        assert.isNotNull(tables);
        assert.equal(tables.length, 0);
      }
    }
  }
}).addBatch({
  'renameTable': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.renameTable('event', 'functions', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('functions', this.callback);
    },

    'has table metadata': {
      topic: function() {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getTables(this.callback);
        }.bind(this));
      },

      'containing the functions table': function(err, tables) {
        assert.isNotNull(tables);
        assert.equal(tables.length, 1);
        assert.equal(tables[0].getName(), 'functions');
      }
    }
  }
}).addBatch({
  'addColumn': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'has column metadata': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getColumns('event', this.callback);
        }.bind(this));
      },

      'with additional title column': function(err, columns) {
        assert.isNotNull(columns);
        assert.equal(columns.length, 2);
        var column = findByName(columns, 'title');
        assert.equal(column.getName(), 'title');
        assert.equal(column.getDataType(), 'VARCHAR');
      }
    }
  }
}).addBatch({
  'removeColumn': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', function(err) {
            db.removeColumn('event', 'title', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'has column metadata': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getColumns('event', this.callback);
        }.bind(this));
      },

      'without title column': function(err, columns) {
        assert.isNotNull(columns);
        assert.equal(columns.length, 1);
        assert.notEqual(columns[0].getName(), 'title');
      }
    }
  }
//}).addBatch({
//  'renameColumn': {
//    topic: function() {
//      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
//        db.createTable('event', {
//          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
//          title: dataType.STRING
//        }, function() {
//          db.renameColumn('event', 'title', 'new_title', this.callback.bind(this, null, db));
//        }.bind(this));
//      }.bind(this));
//    },
//
//    teardown: function(db) {
//      db.dropTable('event', this.callback);
//    },
//
//    'has column metadata': {
//      topic: function(db) {
//        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
//          if (err) {
//            return this.callback(err);
//          }
//          meta.getColumns('event', this.callback);
//        }.bind(this));
//      },
//
//      'with renamed title column': function(err, columns) {
//        assert.isNotNull(columns);
//        assert.equal(columns.length, 2);
//        var column = findByName(columns, 'new_title');
//        assert.isNotNull(column);
//        assert.equal(column.getName(), 'new_title');
//      }
//    }
//  }
}).addBatch({
  'changeColumn': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          txt: { type: dataType.STRING, notNull: true, defaultValue: "foo" }
        }, function(err) {
          if (err) { return this.callback(err); }
          var spec = { type: dataType.STRING, notNull: false, defaultValue: 'foo2' };
          db.changeColumn('event', 'txt', spec, this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'has column metadata': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getColumns('event', this.callback);
        }.bind(this));
      },

      'with changed title column': function(err, columns) {
        assert.isNotNull(columns);
        assert.equal(columns.length, 2);
        var column = findByName(columns, 'txt');
        assert.equal(column.getName(), 'txt');
        assert.equal(column.isNullable(), true);
        assert.equal(column.getDefaultValue(), "foo2");
      }
    }
  }
}).addBatch({
  'addIndex': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.addIndex('event', 'event_title', 'title', this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'has resulting index metadata': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getIndexes('event', this.callback);
        }.bind(this));
      },

      'with additional index': function(err, indexes) {
        assert.isNotNull(indexes);
        assert.equal(indexes.length, 2);
        var index = findByName(indexes, 'event_title');
        assert.equal(index.getName(), 'event_title');
        assert.equal(index.getTableName(), 'event');
        assert.equal(index.getColumnName(), 'title');
      }
    }
  }
}).addBatch({
  'insert': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.insert('event', ['id','title'], [2,'title'], this.callback.bind(this, null, db));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'with additional row' : function(db) {
      db.runSql("SELECT * from event", function(err, data) {
        assert.equal(data.length, 1);
      });
    }
  }
}).addBatch({
  'removeIndex': {
    topic: function() {
      driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addIndex('event', 'event_title', 'title', function(err) {
            db.removeIndex('event_title', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    },

    teardown: function(db) {
      db.dropTable('event', this.callback);
    },

    'has resulting index metadata': {
      topic: function(db) {
        dbmeta('mysql', { database: 'db_migrate_test' }, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getIndexes('event', this.callback);
        }.bind(this));
      },

      'without index': function(err, indexes) {
        assert.isNotNull(indexes);
        assert.equal(indexes.length, 1); // first index is primary key
      }
    }
  }
}).export(module);

function findByName(columns, name) {
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].getName() === name) {
      return columns[i];
    }
  }
  return null;
}
