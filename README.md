# db-migrate

Database migration framework for node.js

## Installation

    $ npm install db-migrate

## Usage

```
Usage: db-migrate [up|down|create] migrationName [options]

Options:
  --env, -e             The environment to run the migrations under.    [default: "dev"]
  --migrations-dir, -m  The directory containing your migration files.  [default: "./migrations"]
  --count, -c           Max number of migrations to run.                              
  --verbose, -v         Verbose mode.                                   [default: false]
  --config              Location of the database.json file.             [default: "./database.json"]
```

## Creating Migrations

To create a migration, execute `db-migrate create` with a title. `node-db-migrate` will create a node module within `./migrations/` which contains the following two exports:

    exports.up = function(db, callback){
      callback();
    };

    exports.down = function(callback){
      callback();
    };

All you have to do is populate these, invoking `callback()` when complete, and you are ready to migrate!

For example:

    $ db-migrate create add-pets
    $ db-migrate create add-owners

The first call creates `./migrations/20111219120000-add-pets.js`, which we can populate:

      exports.up = function(db, callback){
        db.createTable('pets', {
          id: { type: 'integer', primaryKey: true },
          name: 'string'
        }, callback);
      };

      exports.down = function(db, callback){
        db.dropTable('pets', callback);
      };

The second creates `./migrations/20111219120005-add-owners.js`, which we can populate:

      exports.up = function(db, callback){
        db.createTable('owners', {
          id: { type: 'integer', primaryKey: true },
          name: 'string'
        }, callback);
      };

      exports.down = function(db, callback){
        db.dropTable('owners', callback);
      };

Executing multiple statements against the database within a single
migration requires a bit more care. You can either nest the migrations
like:

      exports.up = function(db, callback){
        db.createTable('pets', {
          id: { type: 'integer', primaryKey: true },
          name: 'string'
        }, createOwners);

        function createOwners(err) {
          if (err) { callback(err); return; }
          db.createTable('owners', {
            id: { type: 'integer', primaryKey: true },
            name: 'string'
          }, callback);
        }
      };

      exports.down = function(db, callback){
        db.dropTable('pets', function(err) {
          if (err) { callback(err); return; }
          db.dropTable('owners', callback); 
        })
      };

or use the async library to simplify things a bit, such as:

      var async = require('async');

      exports.up = function(db, callback){
        async.series([
          db.createTable.bind(db, 'pets', {
            id: { type: 'integer', primaryKey: true },
            name: 'string'
          }),
          db.createTable.bind(db, 'owners', {
            id: { type: 'integer', primaryKey: true },
            name: 'string'
          })
        ], callback);
      };

      exports.down = function(db, callback){
        async.series([
          db.dropTable.bind(db, 'pets'),
          db.dropTable.bind(db, 'owners')
        ], callback);
      };


## Running Migrations

When first running the migrations, all will be executed in sequence. A
table named `migrations` will also be created in your database to track
which migrations have been applied.

      $ db-migrate up
      [INFO] Processed migration 20111219120000-add-pets
      [INFO] Processed migration 20111219120005-add-owners
      [INFO] Done

Subsequent attempts to run these migrations will result in the following
output

      $ db-migrate up
      [INFO] No migrations to run
      [INFO] Done

If we were to create another migration using `db-migrate create`, and then execute migrations again, we would execute only those not previously executed:

      $ db-migrate up
      [INFO] Processed migration 20111220120210-add-kennels
      [INFO] Done

You can also run migrations incrementally by specifying a date
substring. The example below will run all migrations created on or
before December 19, 2011:

      $ db-migrate up 20111219
      [INFO] Processed migration 20111219120000-add-pets
      [INFO] Processed migration 20111219120005-add-owners
      [INFO] Done

You can also run a specific number of migrations with the -c option:

      $ db-migrate up -c 1
      [INFO] Processed migration 20111219120000-add-pets
      [INFO] Done

All of the down migrations work identically to the up migrations by
substituting the word `down` for `up`.

## Configuration

db-migrate supports the concept of environments. For example, you might
have a dev, test, and prod environment where you need to run the
migrations at different times. Environment settings are loaded from a
database.json file like the one shown below:
    
    {
      "dev": {
        "driver": "sqlite3",
        "filename": "~/dev.db"
      },

      "test": {
        "driver": "sqlite3",
        "filename": ":memory:"
      },

      "prod": {
        "driver": "mysql",
        "user": "root",
        "password": "root"
      }
    }

You can pass the -e or --env option to db-migrate to select the
environment you want to run migrations against. The --config option can
be used to specify the path to your database.json file if it's not in
the current working directory.

    db-migrate up --config config/database.json -e prod

The above will run all migrations that haven't yet been run in the
prod environment, grabbing the settings from config/database.json.

## Defaults

## Migrations

Below are examples of all the different migrations supported by
db-migrate. Please note that not all migrations are supported by all
databases. For example, SQLite does not support dropping columns.

### createTable(tableName, columnSpec, callback)

Creates a new table with the specified columns.

__Arguments__

* tableName - the name of the table to create
* columnSpec - a hash of column definitions
* callback(err) - callback that will be invoked after table creation

__Examples__

    // with no table options
    exports.up = function(db, callback) {
      db.createTable('pets', {
        id: { type: 'integer', primaryKey: true, autoIncrement: true },
        name: 'string'  // shorthand notation
      }, callback);
    }

    // with table options
    exports.up = function(db, callback) {
      db.createTable('pets', {
        columns: {
          id: { type: 'integer', primaryKey: true, autoIncrement: true },
          name: 'string'  // shorthand notation
        },
        ifNotExists: true
      }, callback);
    }

__Column Specs__

The following options are available on column specs

* type - the column data type. Supported types can be found in
  lib/data_type.js
* primaryKey - true to set the column as a primary key. Compound primary
  keys are supported by setting the `primaryKey` option to true on
  multiple columns
* autoIncrement - true to mark the column as auto incrementing
* notNull - true to mark the column as non-nullable
* unique - true to add unique constraint to the column
* defaultValue - set the column default value

### dropTable(tableName, [options,] callback)
### renameTable(tableName, newTableName, callback)
### addColumn(tableName, columnName, columnSpec, callback)
### removeColumn(tableName, columnName, callback)
### renameColumn(tableName, oldColumnName, newColumnName, callback)
### changeColumn(tableName, columnName, columnSpec, callback)
### addIndex(tableName, indexName, columns, callback)
### removeIndex(indexName, callback)
### runSql(sql, [params,] callback)
### all(sql, [params,] callback)

## License 

(The MIT License)

Copyright (c) 2011 Near Infinity Corporation

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
