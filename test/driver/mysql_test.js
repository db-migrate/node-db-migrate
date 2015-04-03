var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

var config = require('../db.config.json').mysql;

var internals = {};
internals.migrationTable = 'migrations';

var dbName = config.database;
driver.connect(config, internals, function(err, db) {
    assert.isNull(err);
  vows.describe('mysql').addBatch({
    'createTable': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          str: { type: dataType.STRING, unique: true, defaultValue: 'foo' },
          strDefaultNull: { type: dataType.STRING, defaultValue: null },
          txt: { type: dataType.TEXT, notNull: true },
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME,
          ts: dataType.TIMESTAMP,
          bin: dataType.BINARY,
          bl: { type: dataType.BOOLEAN, defaultValue: false }
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

        'with 10 columns': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 10);
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

        'that has text strDefaultNull column that has a default null value': function(err, columns) {
          var column = findByName(columns, 'strDefaultNull');
          assert.equal(column.getDefaultValue(), null);
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

        'that has boolean bl column with a default value': function(err, columns) {
          var column = findByName(columns, 'bl');
          assert.equal(column.getDataType(), 'TINYINT');
          assert.equal(column.isNullable(), true);
          assert.equal(column.getDefaultValue(), 0);
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
        driver.connect(config, internals, function(err) {
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
          txt: { type: dataType.STRING, notNull: true, defaultValue: "foo", unique: true },
          keep_id: { type: dataType.INTEGER, notNull: false, unique: true }
        }, function(err) {
          if (err) {
            return this.callback(err);
          }
          var spec = { type: dataType.STRING, notNull: false, unique: false, defaultValue: 'foo2' },
              spec2 = { type: dataType.INTEGER, notNull: true, unsigned: true };

          db.changeColumn('event', 'txt', spec, function() {
            db.changeColumn('event', 'keep_id', spec2, this.callback.bind(this, null));
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

        'with changed title column': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 3);
          var column = findByName(columns, 'txt');
          assert.equal(column.getName(), 'txt');
          assert.equal(column.isNullable(), true);
          assert.equal(column.getDefaultValue(), "foo2");
          assert.equal(column.isUnique(), false);

          column = findByName(columns, 'keep_id');
          assert.equal(column.getName(), 'keep_id');
          assert.equal(column.isNullable(), false);
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

      'preserves case': {
        topic: function() {
          dbmeta('mysql', { connection:db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getTables(this.callback);
          }.bind(this));
        },

        'of the functions original table': function(err, tables) {
          assert.isNotNull(tables);
          assert.equal(tables.length, 1);
          assert.equal(tables[0].getName(), 'event');
        }
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
    'columnForeignKeySpec': {
      topic: function() {
        db.createTable('event_type', {

            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function() {

            db.createTable('event', {
            id: {
              type: dataType.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            event_id: {
              type: dataType.INTEGER,
              notNull: true,
              foreignKey: {
              name: 'fk_event_event_type',
              table: 'event_type',
              mapping: 'id',
              rules: {
                    onDelete: 'CASCADE'
                },
            } },
            title: {
              type: dataType.STRING
            }
          }, this.callback.bind(this, null));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event');
        db.dropTable('event_type', this.callback);
      },

      'sets usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
            '  usg.REFERENCED_TABLE_NAME,',
            '  usg.REFERENCED_COLUMN_NAME,',
            '    cstr.UPDATE_RULE,',
            '  cstr.DELETE_RULE',
            'FROM',
            '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
            'INNER JOIN',
            '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
            '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
            '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
            'WHERE',
            '  usg.TABLE_SCHEMA = ?',
            '  AND usg.TABLE_NAME = ?',
            '  AND usg.COLUMN_NAME = ?'].join('\n');
          db.runSql(metaQuery, dbName, 'event', 'event_id', this.callback);
        },

        'with correct references': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.REFERENCED_TABLE_NAME, 'event_type');
          assert.equal(row.REFERENCED_COLUMN_NAME, 'id');
        },

        'and correct rules': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.UPDATE_RULE, 'NO ACTION');
          assert.equal(row.DELETE_RULE, 'CASCADE');
        }
      }
    }
  }).addBatch({
    'explicitColumnForeignKeySpec': {
      topic: function() {
        db.createTable('event_type', {

            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function() {

            db.createTable('event', {
            id: {
              type: dataType.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            event_id: {
              type: dataType.INTEGER,
              notNull: true,
              foreignKey: {
                name: 'fk_event_event_type',
                table: 'event_type',
                mapping: 'id',
                rules: {
                      onDelete: 'CASCADE'
                  },
              }
            },
            event_id2: {
              type: dataType.INTEGER,
              notNull: true,
              foreignKey: {
                name: 'fk_event_event2_type',
                table: 'event_type',
                mapping: 'id',
                rules: {
                      onDelete: 'CASCADE'
                  },
              }
            },
            title: {
              type: dataType.STRING
            }
          }, this.callback.bind(this, null));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event');
        db.dropTable('event_type', this.callback);
      },

      'sets usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
            '  usg.REFERENCED_TABLE_NAME,',
            '  usg.REFERENCED_COLUMN_NAME,',
            '    cstr.UPDATE_RULE,',
            '  cstr.DELETE_RULE',
            'FROM',
            '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
            'INNER JOIN',
            '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
            '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
            '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
            'WHERE',
            '  usg.TABLE_SCHEMA = ?',
            '  AND usg.TABLE_NAME = ?',
            '  AND ( usg.COLUMN_NAME = ? OR usg.COLUMN_NAME = ? )'].join('\n');
          db.runSql(metaQuery, dbName, 'event', 'event_id', 'event_id2', this.callback);
        },

        'with correct references': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 2);
          var row = rows[0];
          assert.equal(row.REFERENCED_TABLE_NAME, 'event_type');
          assert.equal(row.REFERENCED_COLUMN_NAME, 'id');

          var row = rows[1];
          assert.equal(row.REFERENCED_TABLE_NAME, 'event_type');
          assert.equal(row.REFERENCED_COLUMN_NAME, 'id');
          var row = rows[1];
          assert.equal(row.UPDATE_RULE, 'NO ACTION');
          assert.equal(row.DELETE_RULE, 'CASCADE');
        },

        'and correct rules': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 2);
          var row = rows[0];
          assert.equal(row.UPDATE_RULE, 'NO ACTION');
          assert.equal(row.DELETE_RULE, 'CASCADE');

          var row = rows[1];
          assert.equal(row.REFERENCED_TABLE_NAME, 'event_type');
          assert.equal(row.REFERENCED_COLUMN_NAME, 'id');
          var row = rows[1];
          assert.equal(row.UPDATE_RULE, 'NO ACTION');
          assert.equal(row.DELETE_RULE, 'CASCADE');
        }
      }
    }
  }).addBatch({
    'addForeignKey': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          event_id: { type: dataType.INTEGER, notNull: true },
          title: { type: dataType.STRING }
        }, function() {
          db.createTable('event_type', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function () {
            db.addForeignKey('event', 'event_type', 'fk_event_event_type', {
              'event_id': 'id'
            }, {
              onDelete: 'CASCADE'
            }, this.callback.bind(this, null));
          }.bind(this));
        }.bind(this));
      },

      teardown: function() {
        db.dropTable('event');
        db.dropTable('event_type', this.callback);
      },

      'sets usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
            '  usg.REFERENCED_TABLE_NAME,',
            '  usg.REFERENCED_COLUMN_NAME,',
            '    cstr.UPDATE_RULE,',
            '  cstr.DELETE_RULE',
            'FROM',
            '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
            'INNER JOIN',
            '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
            '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
            '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
            'WHERE',
            '  usg.TABLE_SCHEMA = ?',
            '  AND usg.TABLE_NAME = ?',
            '  AND usg.COLUMN_NAME = ?'].join('\n');
          db.runSql(metaQuery, dbName, 'event', 'event_id', this.callback);
        },

        'with correct references': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.REFERENCED_TABLE_NAME, 'event_type');
          assert.equal(row.REFERENCED_COLUMN_NAME, 'id');
        },

        'and correct rules': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.UPDATE_RULE, 'NO ACTION');
          assert.equal(row.DELETE_RULE, 'CASCADE');
        }
      }
    }
  }).addBatch({
    'removeForeignKey': {
        topic: function() {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            event_id: { type: dataType.INTEGER, notNull: true },
            title: { type: dataType.STRING }
          }, function() {
            db.createTable('event_type', {
              id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
              title: { type: dataType.STRING }
            }, function () {
              db.addForeignKey('event', 'event_type', 'fk_event_event_type', {
                'event_id': 'id'
              }, {
                onDelete: 'CASCADE'
              }, function () {
                db.removeForeignKey('event', 'fk_event_event_type', this.callback.bind(this, null));
              }.bind(this));
            }.bind(this));
          }.bind(this));
        },

        teardown: function() {
          db.dropTable('event');
          db.dropTable('event_type', this.callback);
        },
      },

      'removes usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
            '  usg.REFERENCED_TABLE_NAME,',
            '  usg.REFERENCED_COLUMN_NAME,',
            '    cstr.UPDATE_RULE,',
            '  cstr.DELETE_RULE',
            'FROM',
            '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
            'INNER JOIN',
            '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
            '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
            '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
            'WHERE',
            '  usg.TABLE_SCHEMA = ?',
            '  AND usg.TABLE_NAME = ?',
            '  AND usg.COLUMN_NAME = ?'].join('\n');
          db.runSql(metaQuery, dbName, 'event', 'event_id', this.callback);
        },

        'completely': function(err, rows) {
          assert.isNotNull(rows);
          assert.equal(rows.length, 0);
        }
      }
  }).addBatch({
    'runSql': {
      'accepts vararg parameters': function() {
        db.runSql("SELECT 1 = ?, 2 = ?", 1, 2, function(err, data) {
          assert.equal(data.length, 1);
        });
      },
      'accepts array parameters': function() {
        db.runSql("SELECT 1 = ?, 2 = ?", [1, 2], function(err, data) {
          assert.equal(data.length, 1);
        });
      }
    }
  }).addBatch({
    'all': {
      'accepts vararg parameters': function() {
        db.all("SELECT 1 = ?, 2 = ?", 1, 2, function(err, data) {
          assert.equal(data.length, 1);
        });
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
    'insertWithSingleQuotes': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function() {
          db.insert('event', ['id','title'], [2,"Bill's Mother's House"], this.callback.bind(this, null));
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
