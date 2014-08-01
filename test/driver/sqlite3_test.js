var fs = require('fs');
var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

var config = require('../db.config.json').sqlite3;

vows.describe('sqlite3').addBatch({
  'createTable': {
    topic: function () {
      driver.connect(config, function (err, db) {
        db.createTable('event', {
          id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true, notNull: true },
          str: { type: dataType.STRING, unique: true },
          txt: { type: dataType.TEXT, notNull: true, defaultValue: "foo" },
          intg: dataType.INTEGER,
          rel: dataType.REAL,
          dt: dataType.DATE_TIME,
          bl: dataType.BOOLEAN
        }, this.callback.bind(this, null, db));
      }.bind(this));
    },

    teardown: function (db) {
      db.close(function (err) {
        fs.unlink(config.filename, this.callback);
      });
    },

    'has resulting table metadata': {
      topic: function (db) {
        dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getTables(this.callback);
        }.bind(this));
      },

      'containing the event table': function (err, tables) {
        assert.isNull(err);
        var table = findByName(tables, 'event');
        assert.isNotNull(table);
        assert.equal(table.getName(), 'event');
      }
    },

    'has column metadata for the event table': {
      topic: function (db) {
        dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
          if (err) {
            return this.callback(err);
          }
          meta.getColumns('event', this.callback);
        }.bind(this));
      },

      'with 7 columns': function (err, columns) {
        assert.isNotNull(columns);
        assert.equal(columns.length, 7);
      },

      'that has integer id column that is primary key, non-nullable, and auto increments': function (err, columns) {
        var column = findByName(columns, 'id');
        assert.equal(column.getDataType(), 'INTEGER');
        assert.equal(column.isPrimaryKey(), true);
        assert.equal(column.isNullable(), false);
        assert.equal(column.isAutoIncrementing(), true);
      },

      'that has text str column that is unique': function (err, columns) {
        var column = findByName(columns, 'str');
        assert.equal(column.getDataType(), 'VARCHAR');
        assert.equal(column.isUnique(), true);
      },

      'that has text txt column that is non-nullable': function (err, columns) {
        var column = findByName(columns, 'txt');
        assert.equal(column.getDataType(), 'TEXT');
        assert.equal(column.isNullable(), false);
//        assert.equal(column.getDefaultValue(), 'foo');
      },

      'that has integer intg column': function (err, columns) {
        var column = findByName(columns, 'intg');
        assert.equal(column.getDataType(), 'INTEGER');
        assert.equal(column.isNullable(), true);
      },

      'that has real rel column': function (err, columns) {
        var column = findByName(columns, 'rel');
        assert.equal(column.getDataType(), 'REAL');
        assert.equal(column.isNullable(), true);
      },

      'that has integer dt column': function (err, columns) {
        var column = findByName(columns, 'dt');
        assert.equal(column.getDataType(), 'DATETIME');
        assert.equal(column.isNullable(), true);
      },

      'that has boolean bl column': function (err, columns) {
        var column = findByName(columns, 'bl');
        assert.equal(column.getDataType(), 'BOOLEAN');
        assert.equal(column.isNullable(), true);
      }
    }
  }
}).addBatch({
    'dropTable': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
          }, function (err) {
            if (err) {
              return this.callback(err);
            }
            db.dropTable('event', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has table metadata': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getTables(this.callback);
          }.bind(this));
        },

        'containing no tables': function (err, tables) {
          assert.isNotNull(tables);
          assert.equal(tables.length, 1);
        }
      }
    }
  }).addBatch({
    'renameTable': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
          }, function () {
            db.renameTable('event', 'functions', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has table metadata': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getTables(this.callback);
          }.bind(this));
        },

        'containing the functions table': function (err, tables) {
          assert.isNotNull(tables);
          var table = findByName(tables, 'functions');
          assert.equal(table.getName(), 'functions');
          assert.isNull(findByName(tables, 'event'));
        }
      }
    }
  }).addBatch({
    'addColumn': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
          }, function () {
            db.addColumn('event', 'title', 'string', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has column metadata': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('event', this.callback);
          }.bind(this));
        },

        'with additional title column': function (err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 2);
          var column = findByName(columns, 'title');
          assert.equal(column.getName(), 'title');
          assert.equal(column.getDataType(), 'VARCHAR');
        }
      }
    }
// removeColumn
// renameColumn
// changeColumn
  }).addBatch({
    'addIndex': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function () {
            db.addIndex('event', 'event_title', 'title', this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has resulting index metadata': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getIndexes('event', this.callback);
          }.bind(this));
        },

        'with additional index': function (err, indexes) {
          assert.isNotNull(indexes);
          var index = findByName(indexes, 'event_title');
          assert.equal(index.getName(), 'event_title');
          assert.equal(index.getTableName(), 'event');
          assert.equal(index.getColumnName(), 'title');
        }
      }
    }
  }).addBatch({
    'insert': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function () {
            db.insert('event', ['id', 'title'], [2, 'title'], this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'with additional row': function (db) {
        db.all("SELECT * from event;", function (err, data) {
          assert.equal(data.length, 1);
        });
      }
    }
  }).addBatch({
    'insertWithSingleQuotes': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function () {
            db.insert('event', ['id', 'title'], [2, "Bill's Mother's House"], this.callback.bind(this, null, db));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'with additional row': function (db) {
        db.all("SELECT * from event;", function (err, data) {
          assert.equal(data.length, 1);
        });
      }
    }
  }).addBatch({
    'removeIndex': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function (err) {
            db.addIndex('event', 'event_title', 'title', function (err) {
              db.removeIndex('event_title', this.callback.bind(this, null, db));
            }.bind(this));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has resulting index metadata': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getIndexes('event', this.callback);
          }.bind(this));
        },

        'without index': function (err, indexes) {
          assert.isNotNull(indexes);
          assert.equal(indexes.length, 0);
        }
      }
    }
  }).addBatch({
    'removeIndexWithTableName': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createTable('event', {
            id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: dataType.STRING }
          }, function (err) {
            db.addIndex('event', 'event_title', 'title', function (err) {
              db.removeIndex('event', 'event_title', this.callback.bind(this, null, db));
            }.bind(this));
          }.bind(this));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has resulting index metadata': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getIndexes('event', this.callback);
          }.bind(this));
        },

        'without index': function (err, indexes) {
          assert.isNotNull(indexes);
          assert.equal(indexes.length, 0);
        }
      }
    }
  }).addBatch({
    'createMigrationsTable': {
      topic: function () {
        driver.connect(config, function (err, db) {
          db.createMigrationsTable(this.callback.bind(this, null, db));
        }.bind(this));
      },

      teardown: function (db) {
        db.close(function (err) {
          fs.unlink(config.filename, this.callback);
        });
      },

      'has migrations table': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getTables(this.callback.bind(this));
          }.bind(this));
        },

        'has migrations table': function (err, tables) {
          assert.isNull(err);
          assert.isNotNull(tables);
          assert.equal(tables.length, 2);
          assert.equal(tables[0].getName(), 'migrations');
        },
      },

      'that has columns': {
        topic: function (db) {
          dbmeta('sqlite3', {connection: db.connection}, function (err, meta) {
            if (err) {
              return this.callback(err);
            }
            meta.getColumns('migrations', this.callback);
          }.bind(this));
        },

        'with names': function (err, columns) {
          assert.isNotNull(columns);
          assert.equal(columns.length, 3);
          var column = findByName(columns, 'id');
          assert.equal(column.getName(), 'id');
          assert.equal(column.getDataType(), 'INTEGER');
          column = findByName(columns, 'name');
          assert.equal(column.getName(), 'name');
          assert.equal(column.getDataType(), 'VARCHAR (255)');
          column = findByName(columns, 'run_on');
          assert.equal(column.getName(), 'run_on');
          assert.equal(column.getDataType(), 'DATETIME');
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
