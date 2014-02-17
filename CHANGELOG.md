## 0.1.0

New Features:

  - Added support for PostgreSQL (via Roman Ostolosh)

## 0.1.1

Fix:

  - Fixed migration table creation for PostgreSQL (via Brandon Keene)

## 0.1.2

Fix:

  - Fix string type for PostgreSQL #14 (via Matt Huggins)
  - Fix renameTable method for PostgreSQL #15 (via Roman Ostolosh)

## 0.1.3

Fix:
  - Respect column length specification on column defs #16 (via Matt Huggins)
  - Allow default environment to be dev or development #17 (via Matt Huggins)

## 0.1.4

Fix:
  - Fix migration table creation error on PostgreSQL >= 9.1 #20
  - Document length property on columns #19 (via Glen Mailer)

## 0.1.5

Fix:
  - Add testing for all supported database drivers
  - Fix dropTable on PostgreSQL #21
  - Implement removeColumn and changeColumn for MySQL

## 0.2.0

New Feature:
  - Expose currently running environment name #22
  - Added an insert method to the API #23
  - Add support for unknown column data types #34

Fix:
  - Fixed error creating migration table #26
  - Fixed removeIndex error in MySQL #37
  - Fixed issue with tests using too many connections under PostgreSQL
  - Fixed error running migrations under sqlite3 #27

## 0.2.1

Improvement:
  - Added compatibility for mysql-2.0.0-alpha driver #25

## 0.2.2

Fix:
  - Fix default value error when using Postgres #43

## 0.2.3

Fix:
  - Fix error when using mysql-2.0.0-alpha3 driver #44

## 0.2.4

Fix:
  - Use --migrations-dir option when specified #47
  - Handle unique constraints in changeColumn() for postgres #46 (via @ryanmeador)

## 0.2.5

Fix:
  - Fix randomly occuring migration sorting error on empty db #51

## 0.2.6

Fix:
  - Fix db.removeIndex for MySQL #42 (via @aprobus)
  - Workaround for node-mysql bug felixge/node-mysql#289 #54 (via
    @aprobus)

## 0.2.7

Fix:
  - Support process.env.DATABASE_URL for postgres, for use with Heroku #57 (via @garth)

## 0.2.8

Improvement
  - Added support for additional MySQL data types #58 (via @jpravetz)

## 0.3.0

Improvement:
  - Added support for MySQLs LONGTEXT #62 (via @joeferner)

New Feature:
  - Added dry-run support for migrations #55 (via @joeferner)

## 0.3.1

Improvement:
  - Added support for boolean data type #66 (via @trojanowski)

## 0.3.2

Fix
  - Update error message when using an invalid data type #67 (via @swang)

## 0.4.0

New Feature:
  - Added support for renameColumn in MySQL #80 (via @akinnunen)

Improvement:
  - Added --version flag #73 (via @mcandre)
  - Lazily require migrations #77, #78 (via @btakita)

Fix
  - Fixed typo in lib/driver/pg.js for BLOB datatype #76

## 0.4.1

Improvement:
  - Add support for BIGINT data type #81

## 0.4.2

Improvement:
	- Superficial changes based on JSHint report #85, #88 (via @mcandre)
	- Let DATABASE_URL configure any database #90 (via @pwnall)

Fix:
	- Fix for postgres driver blindly recreating the migrations table #89 (via @sgibbons)
	- Mitigate `npm test` permission error #95 (via @mcandre)

## 0.5.0

New Feature:
	- Support for database URLs in database.json #103 (via @miguelgrinberg)
	- Option to use native Postgres client #106 (via @olalonde)

Improvement:
	- Updated README.md documentation #98 (via @acco)

## 0.5.1

Improvement:
  - Add a force-exit flag #108 (via @codeaholics)
  - Provide close callback for MySQL driver #107 (via @codeaholics)

## 0.5.2

Fix:
  - Add ability to create camel-cased column names for PostgreSQL #111 (via @virpool)
  - Add ability to make a unique index #110 (via @codeaholics)

## 0.5.3

Fix:
  - Fixed bug setting default values to values that are falsy #114 (via @wbrady)

## 0.5.4

Fix:
  - Add backticks to MySQL driver #114 (via @mstorgaard)

## 0.6.0

New Feature:
  - Support varargs in runSql, all on mysql driver #119 (via @Gloridea)
  - Load Environment Variables specified in config file #118 (via @codyhanson)
  - Added CoffeeScript support for migrations #116 (via @DeniSix)

Improvement:
  - Added date type for sqlite3 #121 (via @mrcsparker)

Fix:
  - Fix postgres issue with camelCased column name definition #125 (via @virpool)

## 0.6.1

Fix:
  - Fix two regressions related to runSql not accepting params as an
    array #127, #128

## 0.6.2

Fix:
  - Fix add index downcasing table name in MySQL #126 (via @noazark)
  - Fix dry run on first migration #132 (via @jgoyon)

Improvement:
  - Add decimal data type support

## 0.6.3

Fix
  - Fix postgres issue with camelCased column name during insert #137 (via @tone81)

## 0.6.4

Improvement:
  - Handle more than one single quote in string literals in a portable way #151 (via @szywon)
  - added date, char and smallint types for pg #150 (via @FabricioFFC)
  - better error handling for broken database.json files #149 (via @acruikshank)

Fix:
  - Make compatible with coffee-script 1.7 #147 (via @jinze)
  - docs: the exports.down fn gets (db, callback) as params #144 (via @alxndr)
  - Fix for multiple single quotes in a string #143

