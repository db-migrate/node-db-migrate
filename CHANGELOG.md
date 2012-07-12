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