var vows = require('vows');
var Promise = require('bluebird');
var assert = require('assert');
var dbmeta = require('db-meta');
var pg = require('pg');
var dataType = require('../../lib/data_type');
var driver = require('../../lib/driver');

var databaseUrl = 'postgres://localhost/db_migrate_test';

var internals = {};
internals.migrationTable = 'migrations';

vows.describe('pg').addBatch({
    'create schema which needs escaping and connect': {
        topic: function() {
            var callback = this.callback;
            var client = new pg.Client(databaseUrl);

            client.connect(function (err) {
                if (err) { return callback(err); }
                client.query('CREATE SCHEMA "test-schema"', function(err) {
                    driver.connect({ driver: 'pg', database: 'db_migrate_test', schema: 'test-schema' }, internals, function(err, db) {
                        callback(err, db, client);
                    });
                });
            });
        },

        'migrations': {
            topic: function(db, client) {
                var callback = this.callback;

                db.createMigrationsTable(function() {
                    client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'test-schema' AND table_name = 'migrations'", function(err, result) {
                        callback(err, result);
                    });
                });
            },

            'is in test-schema': function(err, result) {
                assert.isNull(err);
                assert.isNotNull(result);
                assert.equal(result.rowCount, 1);
            }
        },

        teardown: function(db, client) {
            var callback = this.callback;
            client.query('DROP SCHEMA "test-schema" CASCADE', function (err) {
              if (err) { return callback(err); }
              client.end();
              callback();
          });
        }
    }
})
.addBatch({
    'create schema and a public.migrations table and connect': {
        topic: function() {
            var callback = this.callback;
            var client = new pg.Client(databaseUrl);
            var query = Promise.promisify( client.query ).bind(client);

            client.connect(function (err) {
                if (err) { return callback(err) };
                Promise.all([
                  query('CREATE SCHEMA test_schema'),
                  query('CREATE TABLE migrations ()')
                ])
                .then( function() {

                    driver.connect({ driver: 'pg', database: 'db_migrate_test', schema: 'test_schema' }, internals, function(err, db) {
                        callback(err, db, client);
                    });
                })
                .catch( function(err) {
                  callback(err);
                });
            });
        },

        'migrations table': {
            topic: function(db, client) {
                var callback = this.callback;

                db.createMigrationsTable(function() {
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

        teardown: function(db, client) {
            var callback = this.callback;
            var query = Promise.promisify(client.query).bind(client);

            Promise.all([
              query('DROP SCHEMA test_schema CASCADE'),
              query('DROP TABLE migrations')
            ])
            .then(function (err) {
              client.end();
              callback();
            })
            .catch(function (err) {
              callback(err);
            });
        }
    }
})
.addBatch({
    'create schema and connect': {
        topic: function() {
            var callback = this.callback;
            var client = new pg.Client(databaseUrl);

            client.connect(function (err) {
                if (err) { return callback(err); }
                client.query('CREATE SCHEMA test_schema', function(err) {
                    driver.connect({ driver: 'pg', database: 'db_migrate_test', schema: 'test_schema' }, internals, function(err, db) {
                        callback(err, db, client);
                    });
                });
            });
        },

        'migrations table': {
            topic: function(db, client) {
                var callback = this.callback;

                db.createMigrationsTable(function() {
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

        teardown: function(db, client) {
            var callback = this.callback;
            client.query('DROP SCHEMA test_schema CASCADE', function (err) {
              if (err) { return callback(err); }
              client.end();
              callback();
          });
        }
    }
}).export(module);
