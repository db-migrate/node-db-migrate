## [0.11.7](https://github.com/db-migrate/node-db-migrate/compare/v0.11.6...v0.11.7) (2020-04-14)


### Bug Fixes

* **vuln:** backport [#679](https://github.com/db-migrate/node-db-migrate/issues/679) ([8b5beac](https://github.com/db-migrate/node-db-migrate/commit/8b5beac))


### Features

* **staticLoader:** a static loader to support packaging ([e183046](https://github.com/db-migrate/node-db-migrate/commit/e183046))



## [0.11.6](https://github.com/db-migrate/node-db-migrate/compare/v0.11.5...v0.11.6) (2019-06-08)


### Bug Fixes

* **cwd:** addition of cwd missed function definition ([fae85cf](https://github.com/db-migrate/node-db-migrate/commit/fae85cf))
* **plugin:** allow no package.json ([f27dce0](https://github.com/db-migrate/node-db-migrate/commit/f27dce0))
* **plugin:** handle non existent dependencies and improve UX ([006ef5e](https://github.com/db-migrate/node-db-migrate/commit/006ef5e)), closes [#628](https://github.com/db-migrate/node-db-migrate/issues/628)
* **plugin:** respect options cwd ([#618](https://github.com/db-migrate/node-db-migrate/issues/618)) ([3dae762](https://github.com/db-migrate/node-db-migrate/commit/3dae762))



## [0.11.6](https://github.com/db-migrate/node-db-migrate/compare/v0.11.5...v0.11.6) (2019-06-08)


### Bug Fixes

* **cwd:** addition of cwd missed function definition ([fae85cf](https://github.com/db-migrate/node-db-migrate/commit/fae85cf))
* **plugin:** allow no package.json ([f27dce0](https://github.com/db-migrate/node-db-migrate/commit/f27dce0))
* **plugin:** handle non existent dependencies and improve UX ([006ef5e](https://github.com/db-migrate/node-db-migrate/commit/006ef5e)), closes [#628](https://github.com/db-migrate/node-db-migrate/issues/628)
* **plugin:** respect options cwd ([#618](https://github.com/db-migrate/node-db-migrate/issues/618)) ([3dae762](https://github.com/db-migrate/node-db-migrate/commit/3dae762))


<a name="0.11.5"></a>
## [0.11.5](https://github.com/db-migrate/node-db-migrate/compare/v0.11.4...v0.11.5) (2019-01-06)


### Bug Fixes

* **db:** set exit code as 1 only on error ([3148cc9](https://github.com/db-migrate/node-db-migrate/commit/3148cc9))
* Added warning on plugin loading failure ([fcffd62](https://github.com/db-migrate/node-db-migrate/commit/fcffd62))
* **lgtm:** fix errors ([4cd5558](https://github.com/db-migrate/node-db-migrate/commit/4cd5558))



<a name="0.11.3"></a>
## [0.11.3](https://github.com/db-migrate/node-db-migrate/compare/v0.11.2...v0.11.3) (2018-09-08)


### Bug Fixes

* **db:** create and drop always result in exit code 1 ([d32644c](https://github.com/db-migrate/node-db-migrate/commit/d32644c)), closes [#550](https://github.com/db-migrate/node-db-migrate/issues/550)



<a name="0.11.2"></a>
## [0.11.2](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0...v0.11.2) (2018-09-05)


### Bug Fixes

* **check:** fix check via API not passing results to the callback ([b743696](https://github.com/db-migrate/node-db-migrate/commit/b743696))
* **ci:** add ignores for backported features ([21c3eb9](https://github.com/db-migrate/node-db-migrate/commit/21c3eb9))
* **db:** wrong reference to connect causes db:create to fail ([991ee76](https://github.com/db-migrate/node-db-migrate/commit/991ee76)), closes [#520](https://github.com/db-migrate/node-db-migrate/issues/520)
* **exitCode:** wrong check for existence fixed ([3c6fc33](https://github.com/db-migrate/node-db-migrate/commit/3c6fc33))
* **exitCode:** wrong exit code on db methods ([486cb78](https://github.com/db-migrate/node-db-migrate/commit/486cb78)), closes [#534](https://github.com/db-migrate/node-db-migrate/issues/534)
* **insert:** add missing insert entry to interface ([7ca2f56](https://github.com/db-migrate/node-db-migrate/commit/7ca2f56)), closes [#542](https://github.com/db-migrate/node-db-migrate/issues/542)
* Update dependency `rc` to latest version ([b343add](https://github.com/db-migrate/node-db-migrate/commit/b343add))
* **log:** error ended up in unreadable errors ([16512f6](https://github.com/db-migrate/node-db-migrate/commit/16512f6)), closes [#524](https://github.com/db-migrate/node-db-migrate/issues/524) [#521](https://github.com/db-migrate/node-db-migrate/issues/521)
* **progamableApi:** cmdOptions get passed into setDefaultArgv now ([cb88b58](https://github.com/db-migrate/node-db-migrate/commit/cb88b58))
* **reset:** regression introduced in check functionality ([b94db96](https://github.com/db-migrate/node-db-migrate/commit/b94db96)), closes [#552](https://github.com/db-migrate/node-db-migrate/issues/552)
* **switchDatabase:** no error was thrown on scope switch ([392d88c](https://github.com/db-migrate/node-db-migrate/commit/392d88c)), closes [#470](https://github.com/db-migrate/node-db-migrate/issues/470)
* update vulnerable pack 'deep-extend' and OOD deps ([8e13c7f](https://github.com/db-migrate/node-db-migrate/commit/8e13c7f))


### Features

* **check:** add check functionality to determine migrations to run ([56acdb9](https://github.com/db-migrate/node-db-migrate/commit/56acdb9))
* **contribution:** enrich contribution instructions ([2cd0578](https://github.com/db-migrate/node-db-migrate/commit/2cd0578)), closes [#549](https://github.com/db-migrate/node-db-migrate/issues/549)
* **contribution:** enrich contribution instructions, issues ([5ee386b](https://github.com/db-migrate/node-db-migrate/commit/5ee386b))
* **issuetemplate:** added a github issue template ([3c0fcbf](https://github.com/db-migrate/node-db-migrate/commit/3c0fcbf))
* **progamableApi:** CMD options can be passed programatically now ([fd8562e](https://github.com/db-migrate/node-db-migrate/commit/fd8562e))
* **progamableApi:** using const now ([d761ebf](https://github.com/db-migrate/node-db-migrate/commit/d761ebf))



<a name="0.11.1"></a>
## [0.11.1](https://github.com/db-migrate/node-db-migrate/compare/v0.11.0...v0.11.1) (2018-04-10)


### Bug Fixes

* **reset:** regression introduced in check functionality ([d8a735d](https://github.com/db-migrate/node-db-migrate/commit/d8a735d)), closes [#552](https://github.com/db-migrate/node-db-migrate/issues/552)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/db-migrate/node-db-migrate/compare/v0.10.7...v0.11.0) (2018-04-10)


### Features

* **check:** add check functionality to determine migrations to run ([93e9f18](https://github.com/db-migrate/node-db-migrate/commit/93e9f18))



<a name="0.10.7"></a>
## [0.10.7](https://github.com/db-migrate/node-db-migrate/compare/v0.10.6...v0.10.7) (2018-03-27)


### Bug Fixes

* **progamableApi:** cmdOptions get passed into setDefaultArgv now ([ebdd75d](https://github.com/db-migrate/node-db-migrate/commit/ebdd75d))



<a name="0.10.6"></a>
## [0.10.6](https://github.com/db-migrate/node-db-migrate/compare/v0.10.5...v0.10.6) (2018-03-21)


### Bug Fixes

* **ci:** add ignores for backported features ([53dedc2](https://github.com/db-migrate/node-db-migrate/commit/53dedc2))


### Features

* **contribution:** enrich contribution instructions ([93b5cea](https://github.com/db-migrate/node-db-migrate/commit/93b5cea)), closes [#549](https://github.com/db-migrate/node-db-migrate/issues/549)
* **contribution:** enrich contribution instructions, issues ([d87a734](https://github.com/db-migrate/node-db-migrate/commit/d87a734))
* **progamableApi:** CMD options can be passed programatically now ([69d7605](https://github.com/db-migrate/node-db-migrate/commit/69d7605))
* **progamableApi:** using const now ([a69e221](https://github.com/db-migrate/node-db-migrate/commit/a69e221))



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
