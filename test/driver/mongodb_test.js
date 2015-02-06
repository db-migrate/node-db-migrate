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
					db.getCollectionNames(this.callback);
				},
      
				'containing the functions table': function(err, tables) {
					assert.isNotNull(tables);
					assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
					assert.equal(tables[1].collectionName, 'functions');
				}
			} 
						}
        }).addBatch({
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
                db.getCollectionNames(this.callback);
              },
      
              'of the functions original table': function(err, tables) {
                assert.isNotNull(tables);
                assert.equal(tables.length, 2);	// Should be 2 b/c of the system collection
                assert.equal(tables[1].collectionName, 'event');
              }
            },
      
            'has resulting index metadata': {
              topic: function() {
                db.getIndexes('event', this.callback);
              },
      
              'with additional index': function(err, indexes) {
								assert.isDefined(indexes);
								assert.isNotNull(indexes);
                assert.include(indexes, 'event_title');
              }
            }
          } 
        }).addBatch({
          'insert': {
            topic: function() {
              db.createCollection('event', function(err, collection) {
								if(err) {
									console.log('err = '+err);
									return this.callback(err);
								}
                db.insert('event', [{id: 2, title: 'title'}], this.callback);
              }.bind(this));
            },
      
            teardown: function() {
							db.dropCollection('event', this.callback);
						},
            
            'with additional row' : function() {
              db.find('event', {title: 'title'}, function(err, data) {
								if(err) {
									console.log('err = '+err);
									return this.callback(err);
								}
								
								console.log('data = ');
								console.log(data);
								
                assert.equal(data.length, 1);
              });
            }
          } 
        })*/.addBatch({
          'removeIndex': {
            topic: function() {
              db.createCollection('event', function(err, collection) {
								if(err) {
									console.log('err = '+err);
									return this.callback(err);
								}
								
								
								db.addIndex('event', 'event_title', 'title', false, function(err, data) {
																	
									if(err) {
										console.log('err = '+err);
										return this.callback(err);
									}
																	
									db.removeIndex('event', 'event_title', this.callback);
								}.bind(this));
								
								
								//db.addIndex('event', 'event_title', 'title', false, this.callback);
								
								
                /*
                db.addIndex('event', 'event_title', 'title', function(err) {
                                  db.removeIndex('event', 'event_title', this.callback.bind(this, null));
                                }.bind(this));*/
                
              }.bind(this));
            },
      
            
            teardown: function() {
							db.dropCollection('event', this.callback);
						},
            
      
            'has resulting index metadata': {
              topic: function() {
								console.log('in getIndexes');
                db.getIndexes('event', this.callback);
              },
      
              'without index': function(err, indexes) {
								
								if(err) {
									console.log(err);
									return this.callback(err);
								}
								
								console.log('indexes = '+indexes);
								
								assert.isDefined(indexes);
                assert.isNotNull(indexes);
								assert.notInclude(indexes, 'event_title');
                //assert.equal(indexes.length, 1); // first index is primary key
              }
            }
          } /*
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
            }
          } */
      
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
