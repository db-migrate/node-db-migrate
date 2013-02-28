var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

driver.connect({ driver: 'mysql', database: 'db_migrate_test', user:'root' }, function(err, db) {
  vows.describe('mysql').addBatch({
    'createTable': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          str: { type: dataType.STRING, unique: true, defaultValue: 'foo' },
          txt: { type: dataType.TEXT, notNull: true },
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME,
          ts: dataType.TIMESTAMP,
          bin: dataType.BINARY,
          bl: dataType.BOOLEAN
        }, this.callback);
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has table metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('event', this.callback);
          }.bind(this));
        },

        'with 9 columns': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 9);
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

        'that has datetime dt column': function(err, columns) {
          var column = findByName(columns, 'dt');
          assert.equal(column.getDataType(), 'DATETIME');
          assert.equal(column.isNullable(), true);
        },

        'that has timestamp ts column': function(err, columns) {
          var column = findByName(columns, 'ts');
          assert.equal(column.getDataType(), 'TIMESTAMP');
          assert.equal(column.isNullable(), false);
        },

        'that has binary bin column': function(err, columns) {
          var column = findByName(columns, 'bin');
          assert.equal(column.getDataType(), 'BINARY');
          assert.equal(column.isNullable(), true);
        },

        'that has boolean bl column': function(err, columns) {
          var column = findByName(columns, 'bl');
          assert.equal(column.getDataType(), 'TINYINT');
          assert.equal(column.isNullable(), true);
        }
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
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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

      teardown: function() {
        db.dropTable('functions', this.callback);
      },

      'has table metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', this.callback.bind(this, null));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has column metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
        }, function() {
          db.addColumn('event', 'title', 'string', function(err) {
            db.removeColumn('event', 'title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has column metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
  }).addBatch({
    'renameColumn': {
      topic: function() {
        driver.connect({ driver: 'mysql', database: 'db_migrate_test' }, function(err) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: dataType.STRING
          }, function() {
            db.renameColumn('event', 'title', 'new_title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has column metadata': {
        topic: function() {
          dbmeta('mysql', { connection: db.connection }, function (err, meta) {
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
          assert.isNotNull(column);
          assert.equal(column.getName(), 'new_title');
        }
      }
    }
  }).addBatch({
    'changeColumn': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          txt: { type: dataType.STRING, notNull: true, defaultValue: "foo", unique: true }
        }, function(err) {
          if (err) { 
            return this.callback(err); 
          }
          var spec = { type: dataType.STRING, notNull: false, defaultValue: 'foo2' };
          db.changeColumn('event', 'txt', spec, this.callback.bind(this, null));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has column metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
          assert.equal(column.isUnique(), true);
        }
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

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has resulting index metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.insert('event', ['id','title'], [2,'title'], this.callback.bind(this, null));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'with additional row' : function() {
        db.runSql("SELECT * from event", function(err, data) {
          assert.equal(data.length, 1);
        });
      }
    }
  }).addBatch({
    'removeIndex': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.addIndex('event', 'event_title', 'title', function(err) {
            db.removeIndex('event', 'event_title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event', this.callback);
      },

      'has resulting index metadata': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
  }).addBatch({
    'removeIndexInvalidArgs': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.addIndex('event', 'event_title', 'title', function(err) {
            db.removeIndex('event_title', this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      'removeIndex has errored': function (err) {
        assert.isNotNull(err);
        assert.equal(err.message, 'Illegal arguments, must provide "tableName" and "indexName"');
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

      teardown: function() {
        db.dropTable('migrations', this.callback);
      },

      'has migrations table': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
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
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
              if (err) {
                return this.callback(err);
              }
              meta.getColumns('migrations',this.callback);
            }.bind(this));
          },

          'with names': function(err, columns){
            assert.isNotNull(columns);
            assert.equal(columns.length, 3);
            var column = findByName(columns, 'id');
            assert.equal(column.getName(), 'id');
            assert.equal(column.getDataType(), 'INT');
            column = findByName(columns, 'name');
            assert.equal(column.getName(), 'name');
            assert.equal(column.getDataType(), 'VARCHAR');
            column = findByName(columns, 'run_on');
            assert.equal(column.getName(), 'run_on');
            assert.equal(column.getDataType(), 'DATETIME');
          }
        }
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
