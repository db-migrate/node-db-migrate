var util = require('util');
var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');
var log = require('../..//lib/log.js');

var config = require('../db.config.json').pg;

var internals = {};
internals.migrationTable = 'migrations';
log.silence(true);

driver.connect(config, internals, function(err, db) {
  vows.describe('pg').addBatch({
    'createTable': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          str: { type: dataType.STRING, unique: true },
          txt: { type: dataType.TEXT, notNull: true, defaultValue: "foo" },
          chr: dataType.CHAR,
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          smalint: dataType.SMALLINT,
          dt: dataType.DATE,
          dti: dataType.DATE_TIME,
          bl: dataType.BOOLEAN
        }, this.callback.bind(this));
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

        'with 10 columns': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 10);
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
          assert.equal(column.getDataType(), 'DATE');
          assert.equal(column.isNullable(), true);
        },

        'that has integer dti column': function(err, columns) {
          var column = findByName(columns, 'dti');
          assert.equal(column.getDataType(), 'TIMESTAMP WITHOUT TIME ZONE');
          assert.equal(column.isNullable(), true);
        },

        'that has boolean bl column': function(err, columns) {
          var column = findByName(columns, 'bl');
          assert.equal(column.getDataType(), 'BOOLEAN');
          assert.equal(column.isNullable(), true);
        },

        'that has character chr column': function(err, columns) {
          var column = findByName(columns, 'chr');
          assert.equal(column.getDataType(), 'CHARACTER');
          assert.equal(column.isNullable(), true);
        },

        'that has small integer smalint column': function(err, columns) {
          var column = findByName(columns, 'smalint');
          assert.equal(column.getDataType(), 'SMALLINT');
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
          txt: { type: dataType.TEXT, notNull: true, unique: true, defaultValue: "foo" },
          keep_id: { type: dataType.INTEGER, notNull: true, unique: true },
          type_test: {type:dataType.BLOB, notNull:true}
        }, function() {
          var spec = { notNull: false, defaultValue: "foo2", unique: false },
              spec2 = { notNull: true, unsigned: true},
              spec3 = { type:dataType.INTEGER, using:util.format('USING CAST(CAST("type_test" AS %s) AS %s)', dataType.TEXT, dataType.INTEGER) };

          db.changeColumn('event', 'txt', spec, function() {
            db.changeColumn('event', 'keep_id', spec2, function(){
              db.changeColumn('event', 'type_test', spec3, this.callback.bind(this, null));
            }.bind(this));
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

        'with changed title column': function(err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 4);

          var column = findByName(columns, 'txt');
          assert.equal(column.getName(), 'txt');
          assert.equal(column.isNullable(), true);
          assert.equal(column.getDefaultValue(), "'foo2'::text");
          assert.equal(column.isUnique(), false);

          column = findByName(columns, 'keep_id');
          assert.equal(column.getName(), 'keep_id');
          assert.equal(column.isNullable(), false);
          assert.equal(column.isUnique(), true);

          column = findByName(columns, 'type_test');
          assert.equal(column.getName(), 'type_test');
          assert.equal(dataType[column.getDataType()], dataType.INTEGER);
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
            // lowercase table names because they are quoted in the function
            // and pg uses lowercase internally
            db.addForeignKey('event', 'event_type', 'fk_event_event_type', {
              'event_id': 'id'
            }, {
              onDelete: 'CASCADE'
            }, this.callback);
          }.bind(this));
        }.bind(this));
      },

      'sets usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
              ' tc.table_schema, tc.table_name as ortn, kcu.column_name orcn, ccu.table_name,',
              '  ccu.column_name,',
              '  cstr.update_rule,',
              '  cstr.delete_rule',
              'FROM',
              '  information_schema.table_constraints AS tc',
              'JOIN information_schema.key_column_usage AS kcu',
              '  ON tc.constraint_name = kcu.constraint_name',
              'JOIN information_schema.constraint_column_usage AS ccu',
              '  ON ccu.constraint_name = tc.constraint_name',
              'JOIN information_schema.referential_constraints AS cstr',
              '  ON cstr.constraint_schema = tc.table_schema',
              '    AND cstr.constraint_name = tc.constraint_name',
              'WHERE',
              '  tc.table_schema = ?',
              '  AND tc.table_name = ?',
              '  AND kcu.column_name = ?'].join('\n');
            db.runSql(metaQuery, ['public', 'event', 'event_id'], this.callback);
        },

        'with correct references': function(err, result) {
          var rows = result.rows;
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.table_name, 'event_type');
          assert.equal(row.column_name, 'id');
        },

        'and correct rules': function(err, result) {
          var rows = result.rows;
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.update_rule, 'NO ACTION');
          assert.equal(row.delete_rule, 'CASCADE');
        }
      },

      teardown: function() {
        db.dropTable('event');
        db.dropTable('event_type', this.callback);
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

      'removes usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
              ' tc.table_schema, tc.table_name as ortn, kcu.column_name orcn, ccu.table_name,',
              '  ccu.column_name,',
              '  cstr.update_rule,',
              '  cstr.delete_rule',
              'FROM',
              '  information_schema.table_constraints AS tc',
              'JOIN information_schema.key_column_usage AS kcu',
              '  ON tc.constraint_name = kcu.constraint_name',
              'JOIN information_schema.constraint_column_usage AS ccu',
              '  ON ccu.constraint_name = tc.constraint_name',
              'JOIN information_schema.referential_constraints AS cstr',
              '  ON cstr.constraint_schema = tc.table_schema',
              '    AND cstr.constraint_name = tc.constraint_name',
              'WHERE',
              '  tc.table_schema = ?',
              '  AND tc.table_name = ?',
              '  AND kcu.column_name = ?'].join('\n');
            db.runSql(metaQuery, ['public', 'event', 'event_id'], this.callback);
        },

        'completely': function(err, result) {
          assert.isNotNull(result.rows);
          assert.equal(result.rows.length, 0);
        }
      }
    }
  }).addBatch({
    'addForeign by addcolumn with spec': {
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
            db.addColumn('event_type', 'event_id', {
              type: dataType.INTEGER,
              notNull: true,
              foreignKey: {
                name: 'primary_event_id_fk',
                table: 'event',
                rules: {
                  onDelete: 'CASCADE',
                  onUpdate: 'RESTRICT'
                },
                mapping: 'id'
              }
            }, this.callback.bind(this, null));
            }.bind(this));
          }.bind(this));
      },

      teardown: function() {
        db.dropTable('event_type');
        db.dropTable('event', this.callback);
      },

      'sets usage and constraints': {
        topic: function() {
          var metaQuery = ['SELECT',
              ' tc.table_schema, tc.table_name as ortn, kcu.column_name orcn, ccu.table_name,',
              '  ccu.column_name,',
              '  cstr.update_rule,',
              '  cstr.delete_rule',
              'FROM',
              '  information_schema.table_constraints AS tc',
              'JOIN information_schema.key_column_usage AS kcu',
              '  ON tc.constraint_name = kcu.constraint_name',
              'JOIN information_schema.constraint_column_usage AS ccu',
              '  ON ccu.constraint_name = tc.constraint_name',
              'JOIN information_schema.referential_constraints AS cstr',
              '  ON cstr.constraint_schema = tc.table_schema',
              '    AND cstr.constraint_name = tc.constraint_name',
              'WHERE',
              '  tc.table_schema = ?',
              '  AND tc.table_name = ?',
              '  AND kcu.column_name = ?'].join('\n');
            db.runSql(metaQuery, ['public', 'event_type', 'event_id'], this.callback);
        },

        'with correct references': function(err, result) {
          var rows = result.rows;
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.table_name, 'event');
          assert.equal(row.column_name, 'id');
        },

        'and correct rules': function(err, result) {
          var rows = result.rows;
          assert.isNotNull(rows);
          assert.equal(rows.length, 1);
          var row = rows[0];
          assert.equal(row.update_rule, 'RESTRICT');
          assert.equal(row.delete_rule, 'CASCADE');
        }
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
    'insertWithSingleQuotes': {
      topic: function() {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: dataType.STRING }
        }, function(err) {
          db.insert('event', ['id','title'], [2,"Bill's Mother's House"], this.callback.bind(this, null));
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
