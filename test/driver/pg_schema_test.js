var vows = require('vows');
var assert = require('assert');
var dbmeta = require('db-meta');
var pg = require('pg');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

var client = new pg.Client('postgres://localhost/db_migrate_test');

vows.describe('pg').addBatch({
    'create schema and connect': {
        topic: function() {
            var callback = this.callback;
            
            client.connect(function(err) {
                client.query('CREATE SCHEMA test_schema', function(err) {
                    driver.connect({ driver: 'pg', database: 'db_migrate_test', schema: 'test_schema' }, function(err, db) {
                        callback(null, db);
                    });
                });
            });
        },
        
        'migrations table': {
            topic: function(db) {
                var callback = this.callback;
                
                db._createMigrationsTable(function() {
                    client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_schema' AND table_name = 'migrations'", function(err, result) {
                        callback(err, result);        
                    });
                });
            },
            
            'is in test_schema': function(err, result) {
                assert.isNull(err);
                assert.isNotNull(result);
                assert.equal(result.rowCount, 1);
            }
        },
        
        teardown: function() {
            client.query('DROP SCHEMA test_schema CASCADE', this.callback);
        }
    }
}).export(module);

