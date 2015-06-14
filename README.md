[![Build Status](https://travis-ci.org/db-migrate/node-db-migrate.svg?branch=master)](https://travis-ci.org/db-migrate/node-db-migrate)
[![Dependency Status](https://david-dm.org/db-migrate/node-db-migrate.svg)](https://david-dm.org/db-migrate/node-db-migrate)
[![devDependency Status](https://david-dm.org/db-migrate/node-db-migrate/dev-status.svg)](https://david-dm.org/db-migrate/node-db-migrate#info=devDependencies)
[![Documentation Status](https://readthedocs.org/projects/db-migrate/badge/?version=latest)](https://readthedocs.org/projects/db-migrate/?badge=latest)

# db-migrate

[![Join the chat at https://gitter.im/db-migrate/node-db-migrate](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/db-migrate/node-db-migrate?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/db-migrate.png?downloads=true&downloadRank=true)](https://nodei.co/npm/db-migrate/)

Database migration framework for node.js

## Installation

    $ npm install -g db-migrate

DB-Migrate is now available to you via:

    $ db-migrate

### As local module

Want to use db-migrate as local module?

    $ npm install db-migrate

DB-Migrate is now available to you via:

    $ node node_modules/db-migrate/bin/db-migrate

## Supported Databases

* Mysql (https://github.com/felixge/node-mysql)
* PostgreSQL (https://github.com/brianc/node-postgres)
* sqlite3 (https://github.com/developmentseed/node-sqlite3)
* Mongodb (https://github.com/mongodb/node-mongodb-native)

## Usage

```
Usage: db-migrate [up|down|reset|create|db] [[dbname/]migrationName|all] [options]

Down migrations are run in reverse run order, so migrationName is ignored for down migrations.
Use the --count option to control how many down migrations are run (default is 1).

Options:
  --env, -e                   The environment to run the migrations under.    [default: "dev"]
  --migrations-dir, -m        The directory containing your migration files.  [default: "./migrations"]
  --count, -c                 Max number of migrations to run.
  --dry-run                   Prints the SQL but doesn't run it.              [boolean]
  --verbose, -v               Verbose mode.                                   [default: false]
  --config                    Location of the database.json file.             [default: "./database.json"]
  --force-exit                Call system.exit() after migration run          [default: false]
  --sql-file                  Create sql files for up and down.               [default: false]
  --coffee-file               Create a coffeescript migration file            [default: false]
  --migration-table           Set the name of the migration table.
  --table, --migration-table                                                  [default: "migrations"]
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
    })
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    db.dropTable.bind(db, 'pets'),
    db.dropTable.bind(db, 'owners')
  ], callback);
};
```

### Using files for sqls

If you prefer to use sql files for your up and down statements, you can use the `--sql-file` option to automatically generate these files and the javascript code that load them.

For example:

    $ db-migrate create add-people --sql-file

This call creates 3 files:

```
./migrations/20111219120000-add-people.js
./migrations/sqls/20111219120000-add-people-up.sql
./migrations/sqls/20111219120000-add-people-down.sql
```

The sql files will have the following content:
```sql
/* Replace with your SQL commands */
```

And the javascript file with the following code that load these sql files:

```javascript
dbm = dbm || require('db-migrate');
var type = dbm.dataType;
var fs = require('fs');
var path = require('path');

exports.up = function(db, callback) {
  var filePath = path.join(__dirname + '/sqls/20111219120000-add-people-up.sql');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (err) return console.log(err);
    db.runSql(data, function(err) {
      if (err) return console.log(err);
      callback();
    });
  });
};

exports.down = function(db, callback) {
  var filePath = path.join(__dirname + '/sqls/20111219120000-add-people-down.sql');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (err) return console.log(err);
    db.runSql(data, function(err) {
      if (err) return console.log(err);
      callback();
    });
  });
};
```

** Making it as default **

To not need to always specify the `sql-file` option in your `db-migrate create` commands, you can set a property in your `database.json` as follows:

```
{
    "dev": {
      "host": "localhost",
    ...
  },
    "sql-file" : true
}
```

** Important - For MySQL users **

If you use MySQL, to be able to use multiple statements in your sql file, you have to set the property `multiple-statements: true` when creating the connection object. You can set it in your `database.json` as follows:

```
{
    "dev": {
    "host": "localhost",
    "user": { "ENV" : "DB_USER" },
    "password" : { "ENV" : "DB_PASS" },
    "database": "database-name",
    "driver": "mysql",
    "multipleStatements": true
  }
}
```

You can also place it as a query string parameter into DATABASE_URL variable, as https://github.com/pwnall/node-parse-database-url allows passing them into config:

    $ DATABASE_URL="mysql://DB_USER:DB_PASS@localhost/database-name?multipleStatements=true" db-migrate up

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
    "database": "mydb",
    "schema": "my_schema"
  },

  "mongo": {
    "driver": "mongodb",
    "database": "my_db",
    "host": "localhost"
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

Note that if the settings for an environment are represented by a single string that string will be parsed as a database URL.  You can also provide a database URL through environmental variable like this:
```javascript
{
  "prod": {"ENV": "PRODUCTION_URL"}
}
```

You can pass the -e or --env option to db-migrate to select the environment you want to run migrations against. The --config option can be used to specify the path to your database.json file if it's not in the current working directory.

    db-migrate up --config config/database.json -e prod

The above will run all migrations that haven't yet been run in the prod environment, grabbing the settings from config/database.json.

Alternatively, you can specify a DATABASE_URL
environment variable that will be used in place of the configuration
file settings. This is helpful for use with Heroku.

## Multiple migration scopes

You can have multiple migration scopes, which are subfolders within your migrations folder. A scope gets called like the following:

    $ db-migrate up:myScope

#### Executing all scopes together

If you want to execute all scopes with one command, you can execute the following:

    $ db-migrate up:all

Obviously this means you **CAN'T** create scope which is named all.

#### Scope Configuration

You can also configure the scope to specify a sub configuration. Currently you can only define database and schema within this config.

This config file is used to tell db-migrate to switch to the `database` or
`schema`. Databases is used for most databases, except **postgres**
which needs the schema variable.

It's currently also not possible to switch the database over this config with **postgres**.

```json
{
  "database": "test",
  "schema": "test"
}
```

## Connecting through an SSH tunnel

If you need to connect to the database through an SSH tunnel, you can set the `tunnel` config:

```json
{
  "tunnel": {
    "localPort" : 33333,
    "host": "ssh-machine.example.com",
    "username": "sshuser",
    "privateKeyPath": "/home/sshuser/privatekey.pem"
  }
}
```

One common use case for this is when the remote DB does not accept connections from the host that will be running db-migrate. For example, a database within an AWS
[Virtual Private Cloud (VPC)](http://aws.amazon.com/vpc) that is only open to [EC2](http://aws.amazon.com/ec2) hosts within the same VPC. By pointing the tunnel sshConfig to a host within the DB's
VPC, you can run your migrations from any host.

### Tunnel configuration properties

The `tunnel` config must specify the `localPort` in addition to any configuration necessary to connect to the SSH tunnel. Please see the [https://github.com/Finanzchef24-GmbH/tunnel-ssh](tunnel-ssh)
documentation for more details about what properties to set on the tunnel config. The only addition to that config is the `privateKeyPath` property. If the connection to your SSH host
requires a private key file, you can specify its path using this property.

## Defaults

## Generic Datatypes

There is currently a small list of generic Datatypes you can use, to make your
migrations more database independent.

Find the list of supported types [here](https://github.com/kunklejr/node-db-migrate/blob/master/lib/data_type.js).

## Migrations API - SQL

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
* notNull - true to mark the column as non-nullable, omit it archive database default behavior and false to mark explicitly as nullable
* unique - true to add unique constraint to the column
* defaultValue - set the column default value
* foreignKey - set a foreign key to the column

__Column ForeignKey Spec Examples__

```javascript
exports.up = function(db, callback) {

  //automatic mapping, the mapping key resolves to the column
  db.createTable( 'product_variant',
  {
      id:
      {
        type: 'int',
        unsigned: true,
        notNull: true,
        primaryKey: true,
        autoIncrement: true,
        length: 10
      },
      product_id:
      {
        type: 'int',
        unsigned: true,
        length: 10,
        notNull: true,
        foreignKey: {
          name: 'product_variant_product_id_fk',
          table: 'product',
          rules: {
            onDelete: 'CASCADE',
            onUpdate: 'RESTRICT'
          },
          mapping: 'id'
        }
      },
  }, callback );
};

exports.up = function(db, callback) {

  //explicit mapping
  db.createTable( 'product_variant',
  {
    id:
    {
      type: 'int',
      unsigned: true,
      notNull: true,
      primaryKey: true,
      autoIncrement: true,
      length: 10
    },
    product_id:
    {
      type: 'int',
      unsigned: true,
      length: 10,
      notNull: true,
      foreignKey: {
        name: 'product_variant_product_id_fk',
        table: 'product',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'RESTRICT'
        },
        mapping: {
          product_id: 'id'
        }
      }
    },
  }, callback );
};
```

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

### addForeignKey

Adds a foreign Key

__Arguments__

* tableName - table on which the foreign key gets applied
* referencedTableName - table where the referenced key is located
* keyName - name of the foreign key
* fieldMapping - mapping of the foreign key to referenced key
* rules - ondelete, onupdate constraints
* callback(err) - callback that will be invoked after adding the foreign key

__Example__

```javascript
exports.up = function (db, callback)
{
  db.addForeignKey('module_user', 'modules', 'module_user_module_id_foreign',
  {
    'module_id': 'id'
  },
  {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT'
  }, callback);
};
```

### removeForeignKey

__Arguments__

* tableName - table in which the foreign key should be deleted
* keyName - the name of the foreign key
* options - object of options, see below
* callback - callback that will be invoked once the foreign key was deleted

__Options__

* dropIndex (default: false) - deletes the index with the same name as the foreign key

__Examples__

```javascript
//without options object
exports.down = function (db, callback)
{
  db.removeForeignKey('module_user', 'module_user_module_id_foreign', callback);
};

//with options object
exports.down = function (db, callback)
{
  db.removeForeignKey('module_user', 'module_user_module_id_foreign',
  {
    dropIndex: true,
  }, callback);
};
```

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

## Migrations API - NoSQL

Below are examples of all the different migrations supported by db-migrate for NoSQL databases.

### createCollection(collectionName, callback)

Creates a new collection.

__Arguments__

* collectionName - the name of the collection to create
* callback(err) - callback that will be invoked after table creation

__Examples__

```javascript
exports.up = function (db, callback) {
  db.createCollection('pets', callback);
}
```

### dropCollection(collectionName, callback)

Drop a database collection

__Arguments__

* collectionName - name of the collection to drop
* callback(err) - callback that will be invoked after dropping the collection

### renameCollection(collectionName, newCollectionName, callback)

Rename a database table

__Arguments__

* collectionName - existing collection name
* newCollectionName - new collection name
* callback(err) - callback that will be invoked after renaming the collection

### addIndex(collectionName, indexName, columns, unique, callback)

Add an index

__Arguments__

* collectionName - collection to add the index too
* indexName - the name of the index
* columns - an array of column names contained in the index
* unique - whether the index is unique
* callback(err) - callback that will be invoked after adding the index

### removeIndex(collectionName, indexName, callback)

Remove an index

__Arguments__

* collectionName - name of the collection that has the index
* indexName - the name of the index
* callback(err) - callback that will be invoked after removing the index

### insert(collectionName, toInsert, callback)

Insert an item into a given collection

__Arguments__

* collectionName - collection to insert the item into
* toInsert - an object or array of objects to be inserted into the associated collection
* callback(err) - callback that will be invoked once the insert has been completed.

## Development

The following command runs the vows tests.

```bash
npm test
```

Running the tests requires a one-time setup of the **MySQL**, **MongoDB** and **Postgres** databases.

```bash
mysql -u root -e "CREATE DATABASE db_migrate_test;"
createdb db_migrate_test
```

You will also need to copy `test/db.config.example.json` to `test/db.config.json`
and adjust appropriate to setup configuration for your database instances.

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
