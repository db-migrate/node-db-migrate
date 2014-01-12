# db-migrate

Database migration framework for node.js

## Installation

    $ npm install db-migrate

## Supported Databases

* Mysql (https://github.com/felixge/node-mysql)
* PostgreSQL (https://github.com/brianc/node-postgres)
* sqlite3 (https://github.com/developmentseed/node-sqlite3)

## Usage

```
Usage: db-migrate [up|down|create] migrationName [options]

Options:
  --env, -e             The environment to run the migrations under.    [default: "dev"]
  --migrations-dir, -m  The directory containing your migration files.  [default: "./migrations"]
  --count, -c           Max number of migrations to run.
  --dry-run             Prints the SQL but doesn't run it.              [boolean]
  --verbose, -v         Verbose mode.                                   [default: false]
  --config              Location of the database.json file.             [default: "./database.json"]
  --force-exit          Call system.exit() after migration run          [default: false]
```

## Creating Migrations

To create a migration, execute `db-migrate create` with a title. `node-db-migrate` will create a node module within `./migrations/` which contains the following two exports:

```javascript
exports.up = function (db, callback) {
  callback();
};

exports.down = function (db, callback) {
  callback();
};
```

All you have to do is populate these, invoking `callback()` when complete, and you are ready to migrate!

For example:

    $ db-migrate create add-pets
    $ db-migrate create add-owners

The first call creates `./migrations/20111219120000-add-pets.js`, which we can populate:

```javascript
exports.up = function (db, callback) {
  db.createTable('pets', {
    id: { type: 'int', primaryKey: true },
    name: 'string'
  }, callback);
};

exports.down = function (db, callback) {
  db.dropTable('pets', callback);
};
```

The second creates `./migrations/20111219120005-add-owners.js`, which we can populate:

```javascript
exports.up = function (db, callback) {
  db.createTable('owners', {
    id: { type: 'int', primaryKey: true },
    name: 'string'
  }, callback);
};

exports.down = function (db, callback) {
  db.dropTable('owners', callback);
};
```

Executing multiple statements against the database within a single migration requires a bit more care. You can either nest the migrations like:

```javascript
exports.up = function (db, callback) {
  db.createTable('pets', {
    id: { type: 'int', primaryKey: true },
    name: 'string'
  }, createOwners);

  function createOwners(err) {
    if (err) { callback(err); return; }
    db.createTable('owners', {
      id: { type: 'int', primaryKey: true },
      name: 'string'
    }, callback);
  }
};

exports.down = function (db, callback) {
  db.dropTable('pets', function(err) {
    if (err) { callback(err); return; }
    db.dropTable('owners', callback);
  });
};
```

or use the async library to simplify things a bit, such as:

```javascript
var async = require('async');

exports.up = function (db, callback) {
  async.series([
    db.createTable.bind(db, 'pets', {
      id: { type: 'int', primaryKey: true },
      name: 'string'
    }),
    db.createTable.bind(db, 'owners', {
      id: { type: 'int', primaryKey: true },
      name: 'string'
    });
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    db.dropTable.bind(db, 'pets'),
    db.dropTable.bind(db, 'owners')
  ], callback);
};
```


## Running Migrations

When first running the migrations, all will be executed in sequence. A table named `migrations` will also be created in your database to track which migrations have been applied.

      $ db-migrate up
      [INFO] Processed migration 20111219120000-add-pets
      [INFO] Processed migration 20111219120005-add-owners
      [INFO] Done

Subsequent attempts to run these migrations will result in the following output

      $ db-migrate up
      [INFO] No migrations to run
      [INFO] Done

If we were to create another migration using `db-migrate create`, and then execute migrations again, we would execute only those not previously executed:

      $ db-migrate up
      [INFO] Processed migration 20111220120210-add-kennels
      [INFO] Done

You can also run migrations incrementally by specifying a date substring. The example below will run all migrations created on or before December 19, 2011:

      $ db-migrate up 20111219
      [INFO] Processed migration 20111219120000-add-pets
      [INFO] Processed migration 20111219120005-add-owners
      [INFO] Done

You can also run a specific number of migrations with the -c option:

      $ db-migrate up -c 1
      [INFO] Processed migration 20111219120000-add-pets
      [INFO] Done

All of the down migrations work identically to the up migrations by substituting the word `down` for `up`.

## Configuration

db-migrate supports the concept of environments. For example, you might have a dev, test, and prod environment where you need to run the migrations at different times. Environment settings are loaded from a database.json file like the one shown below:

```javascript
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
  },

  "pg": {
    "driver": "pg",
    "user": "test",
    "password": "test",
    "host": "localhost",
    "database": "mydb"
  },

  "other": "postgres://uname:pw@server.com/dbname"
}
```

You can also specify environment variables in your config file by using a special notation. Here is an example:
```javascript
{
  "prod": {
    "driver": "mysql",
    "user": {"ENV": "PRODUCTION_USERNAME"},
    "password": {"ENV": "PRODUCTION_PASSWORD"}
  },
}
```
In this case, db-migrate will search your environment for variables
called `PRODUCTION_USERNAME` and `PRODUCTION_PASSWORD`, and use those values for the corresponding configuration entry.

Note that if the settings for an environment are represented by a single string that string will be parsed as a database URL.

You can pass the -e or --env option to db-migrate to select the environment you want to run migrations against. The --config option can be used to specify the path to your database.json file if it's not in the current working directory.

    db-migrate up --config config/database.json -e prod

The above will run all migrations that haven't yet been run in the prod environment, grabbing the settings from config/database.json.

Alternatively, you can specify a DATABASE_URL
environment variable that will be used in place of the configuration
file settings. This is helpful for use with Heroku.

## Defaults

## Migrations API

Below are examples of all the different migrations supported by db-migrate. Please note that not all migrations are supported by all databases. For example, SQLite does not support dropping columns.

### createTable(tableName, columnSpec, callback)

Creates a new table with the specified columns.

__Arguments__

* tableName - the name of the table to create
* columnSpec - a hash of column definitions
* callback(err) - callback that will be invoked after table creation

__Examples__

```javascript
// with no table options
exports.up = function (db, callback) {
  db.createTable('pets', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    name: 'string'  // shorthand notation
  }, callback);
}

// with table options
exports.up = function (db, callback) {
  db.createTable('pets', {
    columns: {
      id: { type: 'int', primaryKey: true, autoIncrement: true },
      name: 'string'  // shorthand notation
    },
    ifNotExists: true
  }, callback);
}
```

__Column Specs__

The following options are available on column specs

* type - the column data type. Supported types can be found in lib/data_type.js
* length - the column data length, where supported
* primaryKey - true to set the column as a primary key. Compound primary keys are supported by setting the `primaryKey` option to true on multiple columns
* autoIncrement - true to mark the column as auto incrementing
* notNull - true to mark the column as non-nullable
* unique - true to add unique constraint to the column
* defaultValue - set the column default value

### dropTable(tableName, [options,] callback)

Drop a database table

__Arguments__

* tableName - name of the table to drop
* options - table options
* callback(err) - callback that will be invoked after dropping the table

__Table Options__

* ifExists - Only drop the table if it already exists

### renameTable(tableName, newTableName, callback)

Rename a database table

__Arguments__

* tableName - existing table name
* options - new table name
* callback(err) - callback that will be invoked after renaming the table

### addColumn(tableName, columnName, columnSpec, callback)

Add a column to a database table

__Arguments__

* tableName - name of table to add a column to
* columnName - name of the column to add
* columnSpec - a hash of column definitions
* callback(err) - callback that will be invoked after adding the column

Column spec is the same as that described in createTable

### removeColumn(tableName, columnName, callback)

Remove a column from an existing database table

* tableName - name of table to remove a column from
* columnName - name of the column to remove
* callback(err) - callback that will be invoked after removing the column

### renameColumn(tableName, oldColumnName, newColumnName, callback)

Rename a column

__Arguments__

* tableName - table containing column to rename
* oldColumnName - existing column name
* newColumnName - new name of the column
* callback(err) - callback that will be invoked after renaming the column

### changeColumn(tableName, columnName, columnSpec, callback)

Change the definition of a column

__Arguments__

* tableName - table containing column to change
* columnName - existing column name
* columnSpec - a hash containing the column spec
* callback(err) - callback that will be invoked after changing the column

### addIndex(tableName, indexName, columns, [unique], callback)

Add an index

__Arguments__

* tableName - table to add the index too
* indexName - the name of the index
* columns - an array of column names contained in the index
* unique - whether the index is unique (optional, default false)
* callback(err) - callback that will be invoked after adding the index

### insert(tableName, columnNameArray, valueArray, callback)

Insert an item into a given column

__Arguments__

* tableName - table to insert the item into
* columnNameArray - the array existing column names for each item being inserted
* valueArray - the array of values to be inserted into the associated column
* callback(err) - callback that will be invoked once the insert has been completed.

### removeIndex([tableName], indexName, callback)

Remove an index

__Arguments__

* tableName - name of the table that has the index (Required for mySql)
* indexName - the name of the index
* callback(err) - callback that will be invoked after removing the index

### runSql(sql, [params,] callback)

Run arbitrary SQL

__Arguments__

* sql - the SQL query string, possibly with ? replacement parameters
* params - zero or more ? replacement parameters
* callback(err) - callback that will be invoked after executing the SQL

### all(sql, [params,] callback)

Execute a select statement

__Arguments__

* sql - the SQL query string, possibly with ? replacement parameters
* params - zero or more ? replacement parameters
* callback(err, results) - callback that will be invoked after executing the SQL

## Development

The following command runs the vows tests.

```bash
npm test
```

Running the tests requires a one-time setup of the MySQL and Postgres databases.

```bash
mysql -u root -e "CREATE DATABASE db_migrate_test;"
createdb db_migrate_test
```

## License

(The MIT License)

Copyright (c) 2013 Jeff Kunkle

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
