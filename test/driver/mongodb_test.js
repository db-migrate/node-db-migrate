var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

var config = require('../db.config.json').mongodb;

var dbName = config.database;
driver.connect(config, function(err, db) {
	assert.isNull(err);
  vows.describe('mongodb')/*
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
  					db.getCollectionNames(this.callback);
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
					db.getCollectionNames(this.callback);
				},
      
				'containing no tables': function(err, tables) {
					assert.isNotNull(tables);
					assert.equal(tables.length, 1);	// Should be 1 b/c of the system collection
				}
			}
		} 
	})*/
	.addBatch({
		'renameCollection': {
			topic: function() {
				//console.log('in this topic');
				db.createCollection('event', function(err, collection) {
					console.log('in create collection callback');
					if(err) {
						console.log('err = '+err);
						return this.callback(err);
					}
					
					db.renameCollection('event', 'functions', this.callback);
				}.bind(this));
				
/*
				db.createTable('event', function() {
					db.renameCollection('event', 'functions', this.callback.bind(this, null));
				}.bind(this));*/

			},
           
			teardown: function() {
				db.dropCollection('functions', this.callback);
			},
            
      
            'has table metadata': {
              topic: function() {
								console.log('in this topic');
                db.getCollectionNames(this.callback);
              },
      
              'containing the functions table': function(err, tables) {
								console.log('err = '+err);
								console.log('tables = '+tables);
                assert.isNotNull(tables);
                assert.equal(tables.length, 1);
                assert.equal(tables[0].getName(), 'functions');
              }
            }
						/*}
        }).addBatch({
          'addColumn': {
            topic: function() {
              db.createTable('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
              }, function() {
                db.addColumn('Event', 'title', 'string', this.callback.bind(this, null));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('Event', this.callback);
                  },
            
      
            'has column metadata': {
              topic: function() {
                dbmeta('mysql', { connection:db.connection}, function (err, meta) {
                  if (err) {
                    return this.callback(err);
                  }
                  meta.getColumns('Event', this.callback);
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
              db.createTable('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true }
              }, function() {
                db.addColumn('Event', 'title', 'string', function(err) {
                  db.removeColumn('Event', 'title', this.callback.bind(this, null));
                }.bind(this));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('Event', this.callback);
                  },
            
      
            'has column metadata': {
              topic: function() {
                dbmeta('mysql', { connection:db.connection}, function (err, meta) {
                  if (err) {
                    return this.callback(err);
                  }
                  meta.getColumns('Event', this.callback);
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
              driver.connect(config, function(err) {
                db.createTable('Event', {
                  id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                  title: dataType.STRING
                }, function() {
                  db.renameColumn('Event', 'title', 'new_title', this.callback.bind(this, null));
                }.bind(this));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('Event', this.callback);
                  },
            
      
            'has column metadata': {
              topic: function() {
                dbmeta('mysql', { connection: db.connection }, function (err, meta) {
                  if (err) {
                    return this.callback(err);
                  }
                  meta.getColumns('Event', this.callback);
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
              db.createTable('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                txt: { type: dataType.STRING, notNull: true, defaultValue: "foo", unique: true }
              }, function(err) {
                if (err) {
                  return this.callback(err);
                }
                var spec = { type: dataType.STRING, notNull: false, defaultValue: 'foo2' };
                db.changeColumn('Event', 'txt', spec, this.callback.bind(this, null));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('Event', this.callback);
                  },
            
      
            'has column metadata': {
              topic: function() {
                dbmeta('mysql', { connection:db.connection}, function (err, meta) {
                  if (err) {
                    return this.callback(err);
                  }
                  meta.getColumns('Event', this.callback);
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
              db.createTable('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                title: { type: dataType.STRING }
              }, function() {
                db.addIndex('Event', 'event_title', 'title', this.callback.bind(this, null));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('Event', this.callback);
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
                assert.equal(tables[0].getName(), 'Event');
              }
            },
      
            'has resulting index metadata': {
              topic: function() {
                dbmeta('mysql', { connection:db.connection}, function (err, meta) {
                  if (err) {
                    return this.callback(err);
                  }
                  meta.getIndexes('Event', this.callback);
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
          'addForeignKey': {
            topic: function() {
              db.createTable('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                event_id: { type: dataType.INTEGER, notNull: true },
                title: { type: dataType.STRING }
              }, function() {
                db.createTable('EventType', {
                  id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                  title: { type: dataType.STRING }
                }, function () {
                  db.addForeignKey('Event', 'EventType', 'fk_Event_EventType', {
                    'event_id': 'id'
                  }, {
                    onDelete: 'CASCADE'
                  }, this.callback.bind(this, null));
                }.bind(this));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('Event');
                    db.dropCollection('EventType', this.callback);
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
                db.runSql(metaQuery, dbName, 'Event', 'event_id', this.callback);
              },
      
              'with correct references': function(err, rows) {
                assert.isNotNull(rows);
                assert.equal(rows.length, 1);
                var row = rows[0];
                assert.equal(row.REFERENCED_TABLE_NAME, 'EventType');
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
                db.createTable('Event', {
                  id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                  event_id: { type: dataType.INTEGER, notNull: true },
                  title: { type: dataType.STRING }
                }, function() {
                  db.createTable('EventType', {
                    id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                    title: { type: dataType.STRING }
                  }, function () {
                    db.addForeignKey('Event', 'EventType', 'fk_Event_EventType', {
                      'event_id': 'id'
                    }, {
                      onDelete: 'CASCADE'
                    }, function () {
                      db.removeForeignKey('Event', 'fk_Event_EventType', this.callback.bind(this, null));
                    }.bind(this));
                  }.bind(this));
                }.bind(this));
              },
      
              
              teardown: function() {
                        db.dropCollection('Event');
                        db.dropCollection('EventType', this.callback);
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
                db.runSql(metaQuery, dbName, 'Event', 'event_id', this.callback);
              },
      
              'completely': function(err, rows) {
                assert.isNotNull(rows);
                assert.equal(rows.length, 0);
              }
            }
       
        }).addBatch({
           'run': {
             'accepts vararg parameters': function() {
               db.run("SELECT 1 = ?, 2 = ?", 1, 2, function(err, data) {
                 assert.equal(data.length, 1);
               });
             },
             'accepts array parameters': function() {
               db.run("SELECT 1 = ?, 2 = ?", [1, 2], function(err, data) {
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
              db.createCollection('event', function() {
                db.insert('event', ['id','title'], [2,'title'], this.callback.bind(this, null));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('event', this.callback);
                  },
            
      
            'with additional row' : function() {
              db.run("SELECT * from Event", function(err, data) {
                assert.equal(data.length, 1);
              });
            }
          }
        }).addBatch({
          'insertWithSingleQuotes': {
            topic: function() {
              db.createCollection('event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                title: { type: dataType.STRING }
              }, function() {
                db.insert('event', ['id','title'], [2,"Bill's Mother's House"], this.callback.bind(this, null));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('event', this.callback);
                  },
            
      
            'with additional row' : function() {
              db.runCollection("SELECT * from event", function(err, data) {
                assert.equal(data.length, 1);
              });
            }
          }
        }).addBatch({
          'removeIndex': {
            topic: function() {
              db.createCollection('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                title: { type: dataType.STRING }
              }, function() {
                db.addIndex('event', 'event_title', 'title', function(err) {
                  db.removeIndex('event', 'event_title', this.callback.bind(this, null));
                }.bind(this));
              }.bind(this));
            },
      
            
            teardown: function() {
                    db.dropCollection('event', this.callback);
                  },
            
      
            'has resulting index metadata': {
              topic: function() {
                dbmeta('mongodb', { connection:db.connection}, function (err, meta) {
                  if (err) {
                    return this.callback(err);
                  }
                  meta.getIndexes('Event', this.callback);
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
              db.createCollection('Event', {
                id: { type: dataType.INTEGER, primaryKey: true, autoIncrement: true },
                title: { type: dataType.STRING }
              }, function() {
                db.addIndex('Event', 'event_title', 'title', function(err) {
                  db.removeIndex('event_title', this.callback.bind(this, null));
                }.bind(this));
              }.bind(this));
            },
      
            'removeIndex has errored': function (err) {
              assert.isNotNull(err);
              assert.equal(err.message, 'Illegal arguments, must provide "tableName" and "indexName"');
            },
      
            
            teardown: function() {
                    db.dropCollection('Event', this.callback);
                  }
            
          }
        }).addBatch({
          'createMigrationsTable': {
            topic: function() {
              db.createMigrationsTable(this.callback.bind(this, null));
            },
      
            
            teardown: function() {
                    db.dropCollection('migrations', this.callback);
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
            }*/
          }
      
		//}).export(module);
		// TODO: Uncomment above and remove this before ocmmitting
	}).run();
});
function findByName(columns, name) {
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].getName() === name) {
      return columns[i];
    }
  }
  return null;
}
