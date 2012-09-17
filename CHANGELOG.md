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

