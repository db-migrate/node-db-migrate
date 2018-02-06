<a name="0.10.4"></a>
## [0.10.4](https://github.com/db-migrate/node-db-migrate/compare/v0.10.3...v0.10.4) (2018-02-06)


### Bug Fixes

* **insert:** add missing insert entry to interface ([899b8bc](https://github.com/db-migrate/node-db-migrate/commit/899b8bc)), closes [#542](https://github.com/db-migrate/node-db-migrate/issues/542)



<a name="0.10.3"></a>
## [0.10.3](https://github.com/db-migrate/node-db-migrate/compare/v0.10.2...v0.10.3) (2018-02-03)


### Bug Fixes

* **db:** wrong reference to connect causes db:create to fail ([991ee76](https://github.com/db-migrate/node-db-migrate/commit/991ee76)), closes [#520](https://github.com/db-migrate/node-db-migrate/issues/520)
* **exitCode:** wrong check for existence fixed ([3c6fc33](https://github.com/db-migrate/node-db-migrate/commit/3c6fc33))
* **exitCode:** wrong exit code on db methods ([486cb78](https://github.com/db-migrate/node-db-migrate/commit/486cb78)), closes [#534](https://github.com/db-migrate/node-db-migrate/issues/534)
* **log:** error ended up in unreadable errors ([16512f6](https://github.com/db-migrate/node-db-migrate/commit/16512f6)), closes [#524](https://github.com/db-migrate/node-db-migrate/issues/524) [#521](https://github.com/db-migrate/node-db-migrate/issues/521)
* **switchDatabase:** no error was thrown on scope switch ([392d88c](https://github.com/db-migrate/node-db-migrate/commit/392d88c)), closes [#470](https://github.com/db-migrate/node-db-migrate/issues/470)


### Features

* **issuetemplate:** added a github issue template ([3c0fcbf](https://github.com/db-migrate/node-db-migrate/commit/3c0fcbf))



<a name="0.10.2"></a>
## [0.10.2](https://github.com/db-migrate/node-db-migrate/compare/v0.10.1...v0.10.2) (2017-12-01)


### Bug Fixes

* **log:** error ended up in unreadable errors ([97de65d](https://github.com/db-migrate/node-db-migrate/commit/97de65d)), closes [#524](https://github.com/db-migrate/node-db-migrate/issues/524) [#521](https://github.com/db-migrate/node-db-migrate/issues/521)



<a name="0.10.1"></a>
## [0.10.1](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0...v0.10.1) (2017-11-27)


### Bug Fixes

* **db:** wrong reference to connect causes db:create to fail ([56cb75a](https://github.com/db-migrate/node-db-migrate/commit/56cb75a)), closes [#520](https://github.com/db-migrate/node-db-migrate/issues/520)

## 0.10.0

Note:

This is a cornerstone release. It provides groundwork for many things to come and has worked
on stability and flexibility, while mostly retaining backwards compatibility.

This release was a rewrite of nearly the whole module. However backwards compatibility 
was mostly preeserved. Bug fixes wont be listed for this release, all subsequent releases
will follow the angular standard to automatically generate changelogs.

New Features:
 - Sync
 - Driverless Core
 - Plugin Hooks and overwrites
 - Adjusted migration schema, to allow specific setup routines
 - Version migration schemas itself for future iterations
 - Promise style migrations
 - Programmatic API
 - Restructered major parts of db-migrate
 - Transactional migrations
 - New configuration options

Find a full list of features added here:

https://github.com/db-migrate/node-db-migrate/issues?utf8=%E2%9C%93&q=milestone%3Av0.10.0

# Old Changelogs

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

## 0.7.0 (2014-08-01)

Improvement:
  - Externalize db configuration for tests #180 (via @dlaxar)
  - Tightening up some js syntax #179 (via @paulomcnally)
  - Change down migrations to execute in order they were run #178 (via @ajkerr)
  - addForeignKey and removeForeignKey added to mysql #174 (via @JohanObrink)
  - Add ability to use .env file for config if present #170 (via @bvalosek)

## 0.7.1 (2014-08-05)

Improvement:
  - allow addColumn to create primary keys #183 (via @lourenzo)

## 0.8.0 (2014-11-25)

Improvement:
  - Allow changing schema for Postgres #153 (via @zoips)
  - Enable autoincrement even when emitting primary key #157 (via @kkurahar)
  - New option to auto-generate SQL files #160 (via @tuliomonteazul)
  - Allow dry run to work when there is no migration table #166 (via @jjshoe)
  - Add support for Postgres driver in DATABASE_URL #188 (via @saxicek)
  - Use JSON.stringify on non-string objects #185 (via @G3z)
  - Add back quotes around foreign key name #189 (via @sitnin)
  - Mask passwords in verbose logging #195 (via @Crotery)

## 0.9.0 (2015-02-14)

Improvement:
  - Documentation improvements #223, #210, #199, #158, #138 (Tobias Gurtzick @wzrdtales)
  - Multiple Scope Support (@wzrdtales)
  - Fixed bug by generalizing the usage of automatic quoting over all current drivers #204, #140, #155 (@wzrdtales)
  - MongoDB Driver #205, 217 (Tom Calfish @toymachiner62)
  - Fix error db-migrate command not found, make db-migrate usable as global module #210, #138 (@wzrdtales)
  - Add coffeescript template #208 (@richardfickling)
  - Support for Postgresql foreign keys #203 (@dlaxar and @NOtherDev)
  - Add support to create new databases and schemas #196, #202 (@wzrdtales)
  - Add ability to change the migration table name #192 (@wzrdtales)
  - Fix bug with column unique specification #123 (@wzrdtales)
  - Added support for constraints on columns #35 (@wzrdtales)
  - Added reset functionality #221 (@wzrdtales)
  - Aliased "default" option to "env" #219 (@wzrdtales)

Full log at:
  [v0.9.0](https://github.com/kunklejr/node-db-migrate/issues?q=milestone%3Av0.9.0)
