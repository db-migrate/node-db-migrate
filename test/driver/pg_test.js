var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

driver.connect({ driver: 'pg', database: 'db_migrate_test' }, function(err, db) {
  vows.describe('pg').addBatch({
    'createTable': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          str: { type: dataType.STRING, unique: true },
          txt: { type: dataType.TEXT, notNull: true, defaultValue: "foo" },
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME,
          bl: dataType.BOOLEAN
        }, this.callback.bind(this, null));
      },

      'has table metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('event', this.callback);
          }.bind(this));
        },

        'with 7 columns': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 7);
        },

        'that has integer id column that is primary key, non-nullable, and auto increments': function(err, columns) {
          var column = findByName(columns, 'id');
          assert.equal(column.getDataType(), 'INTEGER');
          assert.equal(column.isPrimaryKey(), true);
          assert.equal(column.isNullable(), false);
          assert.equal(column.isAutoIncrementing(), true);
        },

        'that has text str column that is unique': function(err, columns) {
          var column = findByName(columns, 'str');
          assert.equal(column.getDataType(), 'CHARACTER VARYING');
          assert.equal(column.isUnique(), true);
        },

        'that has text txt column that is non-nullable': function(err, columns) {
          var column = findByName(columns, 'txt');
          assert.equal(column.getDataType(), 'TEXT');
          assert.equal(column.isNullable(), false);
      // assert.equal(column.getDefaultValue(), 'foo');
        },

        'that has integer intg column': function(err, columns) {
          var column = findByName(columns, 'intg');
          assert.equal(column.getDataType(), 'INTEGER');
          assert.equal(column.isNullable(), true);
        },

        'that has real rel column': function(err, columns) {
          var column = findByName(columns, 'rel');
          assert.equal(column.getDataType(), 'REAL');
          assert.equal(column.isNullable(), true);
        },

        'that has integer dt column': function(err, columns) {
          var column = findByName(columns, 'dt');
          assert.equal(column.getDataType(), 'TIMESTAMP WITHOUT TIME ZONE');
          assert.equal(column.isNullable(), true);
        },

        'that has boolean bl column': function(err, columns) {
          var column = findByName(columns, 'bl');
          assert.equal(column.getDataType(), 'BOOLEAN');
          assert.equal(column.isNullable(), true);
        }
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'dropTable': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function(err) {
          if (err) {
            return this.callback(err);
          }
          db.dropTable('event', this.callback.bind(this, null));
        }.bind(this));
      },

      'has table metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.renameTable('event', 'functions', this.callback.bind(this, null));
        }.bind(this));
      },

      'has table metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
      },

      teardown: function() {
        db.dropTable('functions', this.callback);
      }
    }
  }).addBatch({
    'addColumn': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', this.callback.bind(this, null));
        }.bind(this));
      },

      'has column metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
          assert.equal(column.getDataType(), 'CHARACTER VARYING');
        }
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'removeColumn': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', function(err) {
            db.removeColumn('event', 'title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      'has column metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'renameColumn': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', function(err) {
            db.renameColumn('event', 'title', 'new_title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      'has column metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('event', this.callback);
          }.bind(this));
        },

        'with renamed title column': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 2);
          var column = findByName(columns, 'new_title');
          assert.equal(column.getName(), 'new_title');
        }
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'changeColumn': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          txt: { type: dataType.TEXT, notNull: true, defaultValue: "foo" }
        }, function() {
          var spec = { notNull: false, defaultValue: "foo2", unique: true };
          db.changeColumn('event', 'txt', spec, this.callback.bind(this, null));
        }.bind(this));
      },

      'has column metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
          assert.equal(column.getDefaultValue(), "'foo2'::text");
          assert.equal(column.isUnique(), true);
        }
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'addIndex': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.addIndex('event', 'event_title', 'title', this.callback.bind(this, null));
        }.bind(this));
      },

      'has resulting index metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'insert': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function(err) {
          db.insert('event', ['id','title'], [2,'title'], this.callback.bind(this, null));
        }.bind(this));
      },

      'with additional row' : function() {
        db.runSql("SELECT * from event", function(err, data) {
          assert.equal(data.rowCount, 1);
        });
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'removeIndex': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addIndex('event', 'event_title', 'title', function(err) {
            db.removeIndex('event_title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      'has resulting index metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
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
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      }
    }
  }).addBatch({
    'createMigrationsTable': {
      topic: function() {
        db.createMigrationsTable(this.callback.bind(this, null));
      },

      'has migrations table': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getTables(this.callback);
          }.bind(this));
        },

        'has migrations table' : function(err, tables) {
          assert.isNull(err);
          assert.isNotNull(tables);
          assert.equal(tables.length,1);
          assert.equal(tables[0].getName(), 'migrations');
        },

        'that has columns':{
          topic:function(){
            dbmeta('pg', { connection:db.connection}, function (err, meta) {
              if (err) {
                return this.callback(err);
              }
              meta.getColumns('migrations', this.callback);
            }.bind(this));
          },

          'with names': function(err, columns){
            assert.isNotNull(columns);
            assert.equal(columns.length, 3);
            var column = findByName(columns, 'id');
            assert.equal(column.getName(), 'id');
            assert.equal(column.getDataType(), 'INTEGER');
            column = findByName(columns, 'name');
            assert.equal(column.getName(), 'name');
            assert.equal(column.getDataType(), 'CHARACTER VARYING');
            column = findByName(columns, 'run_on');
            assert.equal(column.getName(), 'run_on');
            assert.equal(column.getDataType(), 'TIMESTAMP WITHOUT TIME ZONE');
          }
        }
      },

      teardown: function() {
        db.dropTable('migrations', this.callback);
      }
    }
  }).addBatch({
    'createTable': {
      topic: function() {
        db.createTable('parent', {
          columns: { id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true } }
        }, this.callback.bind(this, null));

        db.createTable('child', {
          columns: { unique_field: { type: dataType.INTEGER } },
          inherits: 'parent'
        }, this.callback.bind(this, null));
      },

      'has table metadata': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getTables(this.callback);
          }.bind(this));
        },

        'containing the parent and child tables': function(err, tables) {
          assert.equal(tables.length, 2);
          assert.equal(tables[0].getName(), 'parent');
          assert.equal(tables[1].getName(), 'child');
        }
      },

      'has column metadata for parent table': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('parent', this.callback);
          }.bind(this));
        },

        'with 1 column': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 1);
        },

        'that has integer id column that is primary key, non-nullable, and auto increments': function(err, columns) {
          var column = findByName(columns, 'id');
          assert.equal(column.getDataType(), 'INTEGER');
          assert.equal(column.isPrimaryKey(), true);
          assert.equal(column.isNullable(), false);
          assert.equal(column.isAutoIncrementing(), true);
        }
      },

      'has column metadata for child table': {
        topic: function() {
          dbmeta('pg', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('child', this.callback);
          }.bind(this));
        },

        'with 2 columns': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 2);
        },

        'that has integer id column that is primary key, non-nullable, and auto increments': function(err, columns) {
          var column = findByName(columns, 'id');
          assert.equal(column.getDataType(), 'INTEGER');
          assert.equal(column.isPrimaryKey(), false); // Primary key is not inherited
          assert.equal(column.isNullable(), false);
        }
      },

      teardown: function() {
        db.dropTable('child', this.callback);
        db.dropTable('parent', this.callback);
      }
    }
  }).export(module);
});

function findByName(columns, name) {
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].getName() === name) {
      return columns[i];
    }
  }
  return null;
}
