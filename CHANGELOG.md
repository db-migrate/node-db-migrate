# [1.7.0](https://github.com/db-migrate/node-db-migrate/compare/v1.6.0...v1.7.0) (2026-10-10)


### Bug Fixes

* a deprecated table keeps its deprecation when renamed for it ([73633f6](https://github.com/db-migrate/node-db-migrate/commit/73633f685d8139343c497bc2cd9dd07c71895e11))


### Features

* drop the backups of data migrations once they are final ([ab0b5d5](https://github.com/db-migrate/node-db-migrate/commit/ab0b5d531c9024f03a9495a73f6bdea1457f4ef3))
* db-migrate status, what db-migrate knows about the database ([9bd150e](https://github.com/db-migrate/node-db-migrate/commit/9bd150e615ea9c6234dc9646ecb441e7008542c3))



# [1.6.0](https://github.com/db-migrate/node-db-migrate/compare/v1.5.0...v1.6.0) (2026-10-10)


### Bug Fixes

* fix learns the records of migrations once, from an empty schema ([ae09d41](https://github.com/db-migrate/node-db-migrate/commit/ae09d41b2204f70f30993a0192edd0f34a840ad2))
* fix learns the steps of the releases again ([6722c7c](https://github.com/db-migrate/node-db-migrate/commit/6722c7c53e4d1e4b03dce8fdcc57174d3c2bf030))


### Features

* db-migrate work runs the jobs of background migrations ([0328557](https://github.com/db-migrate/node-db-migrate/commit/03285574ff694ebc6ca056727652f9164e66ea20))



# [1.5.0](https://github.com/db-migrate/node-db-migrate/compare/v1.4.1...v1.5.0) (2026-10-09)


### Bug Fixes

* revert changeColumn to the previous spec of the column ([43f3547](https://github.com/db-migrate/node-db-migrate/commit/43f35478cb27538ec2ce2c1eb36009f2008efd76))


### Features

* releases, deprecated tables and columns ([761dd3e](https://github.com/db-migrate/node-db-migrate/commit/761dd3eb153bb8e28751db10374954a71f47cf3c))
* purge rows deleted in soft mode with a later release ([b4805a1](https://github.com/db-migrate/node-db-migrate/commit/b4805a12f9b7a6cf402d5288a37d3c756e75fda5))



## [1.4.1](https://github.com/db-migrate/node-db-migrate/compare/v1.4.0...v1.4.1) (2026-10-09)


### Bug Fixes

* background jobs pause while migrations run, down reverts them ([2cf4621](https://github.com/db-migrate/node-db-migrate/commit/2cf4621b2b8335e1de65979c55d1950e464f5122))



# [1.4.0](https://github.com/db-migrate/node-db-migrate/compare/v1.3.0...v1.4.0) (2026-10-09)


### Features

* soft delete and purge in dml migrations, transactions per batch ([c664a74](https://github.com/db-migrate/node-db-migrate/commit/c664a74f2217380f3a2074d37731043314ab32b4))
* background migrations, run as jobs by executeWork ([0acdb0b](https://github.com/db-migrate/node-db-migrate/commit/0acdb0b9c69bad396b6166171375b3fd78378ac3))



# [1.3.0](https://github.com/db-migrate/node-db-migrate/compare/v1.2.0...v1.3.0) (2026-10-09)


### Features

* dml migrations, reversible data changes in v2 migrations ([528e968](https://github.com/db-migrate/node-db-migrate/commit/528e96812a06f404d4c98688ac4c7dfc5bd8dae6))
* static seeds, rerunnable data for development and tests ([e27e417](https://github.com/db-migrate/node-db-migrate/commit/e27e417b29e17a7c723bab896c275cba93f58562)), closes [#687](https://github.com/db-migrate/node-db-migrate/issues/687)



# [1.2.0](https://github.com/db-migrate/node-db-migrate/compare/v1.1.0...v1.2.0) (2026-10-09)


### Features

* **v1:** run single migrations without a transaction ([7ea0c3a](https://github.com/db-migrate/node-db-migrate/commit/7ea0c3a62bc672990d8f9ca90de75f9da395c5d6)), closes [#659](https://github.com/db-migrate/node-db-migrate/issues/659) [#819](https://github.com/db-migrate/node-db-migrate/issues/819) [#424](https://github.com/db-migrate/node-db-migrate/issues/424)

  A v1 migration with `exports._meta = { transactions: false }` runs without the
  transaction of the driver, e.g. for `CREATE INDEX CONCURRENTLY` of PostgreSQL.
  With mysql it needs db-migrate-mysql 3.1.2, before its data changes could get
  lost after a migration running inside a transaction.


### Chores

* **deps:** update dependencies ([49b5a3f](https://github.com/db-migrate/node-db-migrate/commit/49b5a3fbb887d35c262779931ee497e0b05ae669))



# [1.1.0](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0...v1.1.0) (2026-10-09)


### Features

* **v2:** adopt objects created outside of v2 migrations ([90cb631](https://github.com/db-migrate/node-db-migrate/commit/90cb6317698710406e879fdb0ecc37c1f604a489))

  `db.adopt.createTable`, `addColumn`, `addIndex`, `addForeignKey` and the other
  create and add instructions declare objects created by v1 migrations or by hand
  to the schema without executing anything. Afterwards v2 migrations handle them
  like their own ones, fully revertible. Dropping an unknown table, column or
  foreign key requires `{ irreversible: true }`, such a migration is not rolled
  back and `down` refuses it. Errors on unknown objects point to both.

* **scope:** scopes with their own database, state kept per scope ([7cf6d9a](https://github.com/db-migrate/node-db-migrate/commit/7cf6d9a842d05490aff35fdc0bc0310734c32bae))

  A scope `config.json` with connection settings like a host or user connects the
  scope on its own, inheriting the settings of the environment. Scopes switching
  only the database or schema keep their lock, recovery progress and learned
  schema in their own database now.


### Bug Fixes

* **scope:** `up:all` and the other commands with the scope `all` only ran the top level migrations ([7cf6d9a](https://github.com/db-migrate/node-db-migrate/commit/7cf6d9a842d05490aff35fdc0bc0310734c32bae))
* **create:** `create:<scope> <name> --sql-file` put the sql files into the wrong folder ([ce20b2c](https://github.com/db-migrate/node-db-migrate/commit/ce20b2cb06ae069842bac3533611bdbe4ddb415f))
* **db:** `db:create` and `db:drop` resolved before they were done and exited the process when called through the API ([0345f62](https://github.com/db-migrate/node-db-migrate/commit/0345f62cbcd6ea514dfe33eab0022acc012a2458))
* **config:** `state-table` and `migration-table` in rc files, `--ignore-completed-migrations`, and the arguments of the application parsed in module mode ([11564c1](https://github.com/db-migrate/node-db-migrate/commit/11564c1e822026685335b446645ab1ccec49ac7c))


### Upgrade notes

* A scope with a `config.json` setting a database or schema keeps its state in its
  own database now. If its v2 migrations ran before, run `db-migrate fix:<scope>`
  once to learn its schema there.
* The pg setting `schema` is applied again with db-migrate-pg 1.6.1.



# [1.0.0](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-rc.0...v1.0.0) (2026-10-09)

The first stable release of db-migrate 1.0, identical to 1.0.0-rc.0. Coming
from 0.11, these are the changes to know about.


### Highlights since 0.11

* **Migration lock:** concurrent processes migrating the same database
  coordinate through a lock in the state table. Only one migrates, the others
  wait and run whatever is still pending afterwards. A process that died is
  detected and taken over after `--lock-timeout` (default 60s).
* **Migration schema v2** (`_meta.version = 2`): migrations without a down
  function, db-migrate learns the schema and reverts a failed migration on its
  own. Interrupted runs are recovered on the next run, by skipping the steps
  already executed or by rolling them back (`_meta.recovery`). v1 migrations
  keep working unchanged.
* **Error output:** a failed migration names the migration, the instruction,
  the failed statement with a marker at the position reported by the database
  and the diagnostic fields of the driver.
* **Plugins:** plain SQL migrations with
  [db-migrate-plugin-sql](https://github.com/db-migrate/plugin-sql), ssh tunnels
  with [db-migrate-plugin-tunnel-ssh](https://github.com/db-migrate/plugin-tunnel-ssh).
* **Dependencies:** `prompt`, `semver`, `mkdirp`, `balanced-match` and
  `tunnel-ssh` are gone, and with them their known vulnerabilities.


### ⚠ BREAKING CHANGES since 0.11

* **node:** Node.js 24 and newer are supported officially.
* **tunnel:** a configured `tunnel` requires installing
  `db-migrate-plugin-tunnel-ssh`.
* **seed:** the seeders are dropped, `db-migrate seed` and the seed API
  methods fail with a clear message. A new concept follows separately.
* **transition:** the `transition` command for migrations of db-migrate
  before 0.9 is removed, use 0.11 to transition such migrations first.
* **state:** db-migrate creates and maintains a state table
  (`migrations_state`, set with `--state-table`) next to the migrations table.



# [1.0.0-rc.0](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.38...v1.0.0-rc.0) (2026-10-09)


### ⚠ BREAKING CHANGES

* **node:** Node.js 24 and newer are supported officially. The `engines` field is dropped, older versions keep installing and may work, untested. ([b01e9c7](https://github.com/db-migrate/node-db-migrate/commit/b01e9c7b9cee317fa7fc01f76f8c030b1e80651e))
* **tunnel:** a configured `tunnel` requires `npm install db-migrate-plugin-tunnel-ssh`, it is no longer built in. ([ba5dc17](https://github.com/db-migrate/node-db-migrate/commit/ba5dc1758f6a893ccb96b80e11f6e13c2780c0e5))
* **seed:** the unfinished seeders are dropped, `db-migrate seed` and the seed API methods fail with a clear message. ([e8de581](https://github.com/db-migrate/node-db-migrate/commit/e8de58156ada61eab471e15f4831d2cec4bf926c))


### Features

* **log:** show what failed in migration errors: the migration, for v2 the instruction and step, the failed statement with a marker at the position reported by the database, the diagnostic fields of the driver and always the stack ([e0017a7](https://github.com/db-migrate/node-db-migrate/commit/e0017a7bd22eaac5f28fa00025eaa7e49effa9d4)), closes [#815](https://github.com/db-migrate/node-db-migrate/issues/815)
* **file:** let plugins load their migration files, used by the new [db-migrate-plugin-sql](https://github.com/db-migrate/plugin-sql) for plain SQL migrations ([34ac8c2](https://github.com/db-migrate/node-db-migrate/commit/34ac8c2581779eed75f12f86e7a7c35d334fed19)), closes [#401](https://github.com/db-migrate/node-db-migrate/issues/401)


### Bug Fixes

* **tunnel:** tunnels failed since db-migrate opens a second connection, the connections share one tunnel now ([ba5dc17](https://github.com/db-migrate/node-db-migrate/commit/ba5dc1758f6a893ccb96b80e11f6e13c2780c0e5))
* **tunnel:** db-migrate-plugin-tunnel-ssh was never called the way it is implemented ([ba5dc17](https://github.com/db-migrate/node-db-migrate/commit/ba5dc1758f6a893ccb96b80e11f6e13c2780c0e5))
* **seed:** `seed` silently did nothing and exited successfully, `undo-seed` failed on wrong require paths ([e8de581](https://github.com/db-migrate/node-db-migrate/commit/e8de58156ada61eab471e15f4831d2cec4bf926c)), closes [#798](https://github.com/db-migrate/node-db-migrate/issues/798)
* **deps:** no more dependency on `tunnel-ssh` and its vulnerable `ssh2` ([ba5dc17](https://github.com/db-migrate/node-db-migrate/commit/ba5dc1758f6a893ccb96b80e11f6e13c2780c0e5)), closes [#830](https://github.com/db-migrate/node-db-migrate/issues/830)


### Chores

* replace mkdirp with native fs.promises.mkdir ([e161c44](https://github.com/db-migrate/node-db-migrate/commit/e161c449e95fc77e0bdc892c0b9c317377a88719)), closes [#835](https://github.com/db-migrate/node-db-migrate/issues/835)
* fix typos ([a29ca87](https://github.com/db-migrate/node-db-migrate/commit/a29ca8736c3fc3c6bc37627187a6233ccd1b1556))



# [1.0.0-beta.38](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-10-08)


### Bug Fixes

* **state:** roll back exactly the steps executed ([1b46d94](https://github.com/db-migrate/node-db-migrate/commit/1b46d940fa2a2af07d4fc2e2363be1eea0dcefbf))

  Rolling back a failed v2 migration dropped the last recorded reverse operation
  whenever the last started instruction did not signal its execution, which only
  createTable and addColumn do. Instructions like addIndex or createEnum followed
  by an error, or an instruction failing while being learned, left objects behind,
  failing the next run with "already exists".

* **learn:** keep everything removed for reverting ([1c927bf](https://github.com/db-migrate/node-db-migrate/commit/1c927bff6e069594562d3030bd4f241e9c08d4c8))

  Removing a second column, index or foreign key from the same table in one
  migration lost the definition of the first one, so its rollback failed and left
  the state stuck. Removed foreign keys were not restored by rollback or down.



# [1.0.0-beta.37](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-10-08)


### Features

* **state:** recover interrupted migrations ([b840b76](https://github.com/db-migrate/node-db-migrate/commit/b840b76fd950eff7735a7fa99bc10ab6016aa6a4))

  A v2 migration interrupted by a dying process, or by a rollback failing itself,
  is recovered on the next run instead of being executed from the start again.
  How is set per migration by `_meta.recovery`:

  * `skip` (default): skip the steps already executed, each one is logged with
    the migration, the instruction and its step, and continue with the rest.
  * `rollback`: revert the steps already executed and run the migration again.

  A run interrupted while rolling back always continues the rollback. Skipping is
  refused if the migration file changed since it was interrupted.
  Runs interrupted with an older version can not be recovered.


### Bug Fixes

* **connect:** running a scope without its own config.json failed with "the target of promisifyAll must be an object or a function" ([3c10136](https://github.com/db-migrate/node-db-migrate/commit/3c101369ebaed1123b5e3df6dce91d8c660a3878))
* **state:** an interrupted rollback reversed the order of the stored reverse operations ([b840b76](https://github.com/db-migrate/node-db-migrate/commit/b840b76fd950eff7735a7fa99bc10ab6016aa6a4))



# [1.0.0-beta.36](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-10-08)


### Features

* **state:** lock migrations against concurrent processes ([e52857c](https://github.com/db-migrate/node-db-migrate/commit/e52857c70fe5c7bfbaa88ed8f3b7c3b71a913bb7))

  Pending migrations are determined first, the lock in the state table is only
  acquired if there is something to run. Processes not getting the lock wait for
  its release and determine the pending migrations again. A lock held by a process
  without any sign of life for `--lock-timeout` ms (default 60000) is taken over,
  waiting processes check every `--lock-interval` ms (default 1000).

  Requires a driver declaring `_meta.supports.locking`: db-migrate-pg >= 1.6.0,
  db-migrate-mysql >= 3.1.0, db-migrate-sqlite3 >= 1.1.0 and
  db-migrate-cockroachdb >= 5.8.0. Other drivers show a warning and run without a
  lock as before.


### Bug Fixes

* **state:** concurrent first runs on an empty database failed creating the state ([e52857c](https://github.com/db-migrate/node-db-migrate/commit/e52857c70fe5c7bfbaa88ed8f3b7c3b71a913bb7))
* **state:** an empty stored schema broke v2 migrations ([e52857c](https://github.com/db-migrate/node-db-migrate/commit/e52857c70fe5c7bfbaa88ed8f3b7c3b71a913bb7))



# [1.0.0-beta.17](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2021-11-15)


### Bug Fixes

* bump dependencies ([0c6a9f3](https://github.com/db-migrate/node-db-migrate/commit/0c6a9f33eb213323f8280f4a48211591a2d09d2c))
* scopes did not use new properties on walker class ([4a0326b](https://github.com/db-migrate/node-db-migrate/commit/4a0326bc4175f63655014823b71890d6174e3fae)), closes [#757](https://github.com/db-migrate/node-db-migrate/issues/757)



# [1.0.0-beta.16](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.15...v1.0.0-beta.16) (2021-09-21)


### Features

* add extra schema type for custom extension flexiblity ([1966068](https://github.com/db-migrate/node-db-migrate/commit/1966068172899dc64c4484ccf055a8a4edcb41c5))



# [1.0.0-beta.15](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2021-05-25)


### Bug Fixes

* rename needs to move all objects to new scope ([9c539a3](https://github.com/db-migrate/node-db-migrate/commit/9c539a3f047190bfba5d0737c815086abc915823))


### Features

* generate package.json to support ESM projects ([05fde89](https://github.com/db-migrate/node-db-migrate/commit/05fde89f360ede7f3b8f9fa96cfdc32f1f77530b))



# [1.0.0-beta.14](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2020-12-26)



# [1.0.0-beta.13](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2020-12-24)



# [1.0.0-beta.12](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2020-12-24)



# [1.0.0-beta.11](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.10...v1.0.0-beta.11) (2020-12-24)



# [1.0.0-beta.10](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2020-12-24)



# [1.0.0-beta.9](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.8...v1.0.0-beta.9) (2020-12-24)



# [1.0.0-beta.8](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.7...v1.0.0-beta.8) (2020-05-05)



# [1.0.0-beta.7](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.6...v1.0.0-beta.7) (2020-04-18)


### Features

* **plugin:** add hook for tunnel ([6e9e282](https://github.com/db-migrate/node-db-migrate/commit/6e9e282597318dcf8fd3fc93ae5bd280baf29d96))



# [1.0.0-beta.6](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2020-04-16)


### Code Refactoring

* **transition:** remove transitioner entirely ([a0432f1](https://github.com/db-migrate/node-db-migrate/commit/a0432f1a6648cdc060e2d427fd1a5c8314c52c8d)), closes [#627](https://github.com/db-migrate/node-db-migrate/issues/627)


### BREAKING CHANGES

* **transition:** the transitioner will disappear from the API
entirely. The need for it disappeared since it was there to
help with the migration from very old migration schemas to
the new ones that did not support very old globals and async
the library provided by db-migrate itself.
Users that for some reason need that can get it from the v0.11.x
versions and then migrate to the newest version afterwards.



# [1.0.0-beta.5](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.4...v1.0.0-beta.5) (2020-04-16)


### Bug Fixes

* **v2:** add direction to internals and dont learn on transaltion ([22b4ce6](https://github.com/db-migrate/node-db-migrate/commit/22b4ce690a52aeda6240172019aae4ba098644e1))
* **v2:** handle reversing of history sensitive operations better ([7db8607](https://github.com/db-migrate/node-db-migrate/commit/7db8607f6561990b20cd05abd02c49afbd9f2090)), closes [#666](https://github.com/db-migrate/node-db-migrate/issues/666)
* **v2:** initialize modS before usage ([9855bf0](https://github.com/db-migrate/node-db-migrate/commit/9855bf068b9c7795ed296dc0d2e076c77699715a)), closes [#665](https://github.com/db-migrate/node-db-migrate/issues/665)



# [1.0.0-beta.4](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.2...v1.0.0-beta.4) (2020-04-15)


### Bug Fixes

* **api:** pass migrationName to create correctly ([388b779](https://github.com/db-migrate/node-db-migrate/commit/388b7791b49c21b591cf3faaa21f5b3b73df325f)), closes [#652](https://github.com/db-migrate/node-db-migrate/issues/652)
* **create migration:** Convert to string before splitting name ([f4aacda](https://github.com/db-migrate/node-db-migrate/commit/f4aacda2b44f313ed07496e8ede4241bc06d727c))
* **down api:** support using down api can specify the destination and housekeep the former pull request ([42db883](https://github.com/db-migrate/node-db-migrate/commit/42db883e9d8e1747593652d3955d7c02aaaa8390))
* **learn:** non notNull columns can be safely deleted ([b75403d](https://github.com/db-migrate/node-db-migrate/commit/b75403d51cc44dec37a8e91382b59ba9424a458a))
* **lint:** adjust linter config and specify ecmascript version explicitly ([d9ccfbe](https://github.com/db-migrate/node-db-migrate/commit/d9ccfbeb46db4ec6f82d10a98ed8d4b1c83c0676))
* **test:** added create scoped migration tests ([2c9e2c4](https://github.com/db-migrate/node-db-migrate/commit/2c9e2c4f572d4c5156c04d92b24bcaa940add863))
* **v2:** learn should write a 0 action for renaming, call endMigration for state at the end of up ([0b935d7](https://github.com/db-migrate/node-db-migrate/commit/0b935d7eb320a6bf11983081721a27333dd4fe5f))
* [#468](https://github.com/db-migrate/node-db-migrate/issues/468) ([87dc950](https://github.com/db-migrate/node-db-migrate/commit/87dc9502c7065264145237703533a9b5928af0a7))
* require node >= 8 ([b366a8e](https://github.com/db-migrate/node-db-migrate/commit/b366a8e72bf51524078d177ec95da3d64733e336))


### Features

* **config:** support custom dotenv path ([aef82c3](https://github.com/db-migrate/node-db-migrate/commit/aef82c3300dec288d6fdfbdde4672e521eda6479))
* **defaultColumn:** add conventions of default columns ([c3a1583](https://github.com/db-migrate/node-db-migrate/commit/c3a1583e784560bfcd38443c41b19c133043b1b4))
* **defaultColumn:** allow disabling default columns ([2d4e92c](https://github.com/db-migrate/node-db-migrate/commit/2d4e92c36bc954f358ca8faa9b4ec5e147937c7e))
* **hook:** inject new template into create migration command ([b20fa1c](https://github.com/db-migrate/node-db-migrate/commit/b20fa1c4f775a162b4a786827f1bf033585eba4e))
* **plugin:** add template plugin hook ([0de35ee](https://github.com/db-migrate/node-db-migrate/commit/0de35ee9364efbe75c6d1e1673da9fb6f708e9fc))
* **staticLoader:** a static loader to support packaging ([7cf6f71](https://github.com/db-migrate/node-db-migrate/commit/7cf6f7113dae0b5103274c977981843386ce0643))



# [1.0.0-beta.2](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2019-06-11)



# [1.0.0-beta.1](https://github.com/db-migrate/node-db-migrate/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2019-06-11)


### Bug Fixes

* **learn:** respect column arrays for indizies ([3649d69](https://github.com/db-migrate/node-db-migrate/commit/3649d69335b62847a6fc24fd6bb11cd37d5d857b))



# [1.0.0-beta.0](https://github.com/db-migrate/node-db-migrate/compare/v0.11.5...v1.0.0-beta.0) (2019-06-08)


### Bug Fixes

* **cwd:** addition of cwd missed function definition ([7c238a4](https://github.com/db-migrate/node-db-migrate/commit/7c238a4630442b054d4a4e0cfce8921a1ab14bd6))
* **plugin:** handle non existent dependencies and improve UX ([91b9da9](https://github.com/db-migrate/node-db-migrate/commit/91b9da90829ce9f51cfff2b614314ae5a9fefd3b)), closes [#628](https://github.com/db-migrate/node-db-migrate/issues/628)
* **plugin:** respect options cwd ([#618](https://github.com/db-migrate/node-db-migrate/issues/618)) ([3a8a09f](https://github.com/db-migrate/node-db-migrate/commit/3a8a09fb57db91ee9c82e98a478646f11338ead1))
* **reset:** regression introduced in check functionality ([61ca5bb](https://github.com/db-migrate/node-db-migrate/commit/61ca5bb3a6067759984de6d5f141d38efe997805)), closes [#552](https://github.com/db-migrate/node-db-migrate/issues/552)
* **scope:** new scoping errored out when using templates ([b2421e3](https://github.com/db-migrate/node-db-migrate/commit/b2421e3f953d0081211bab41326bf488c6007f99))
* **utils:** resolve when returned null ([68361fe](https://github.com/db-migrate/node-db-migrate/commit/68361feb57fefdfa7a6ecb84d79a73b4b0e02431))
* **walker:** rename interface to Interface ([6234d42](https://github.com/db-migrate/node-db-migrate/commit/6234d4285998d9d9e6779b56335fcdcaf350b853))


### Features

* **chain:** add step chaining ([8203c55](https://github.com/db-migrate/node-db-migrate/commit/8203c5540d90871b617175157b0b69d7b714cf79))
* **error handling:** added advanced error handling and rollback ([aa13a35](https://github.com/db-migrate/node-db-migrate/commit/aa13a35193d747adc7eed20de80a8cb929a5a973))
* **learning:** add db learning ([d5c9aa1](https://github.com/db-migrate/node-db-migrate/commit/d5c9aa15bb0a0d5944268ca0406f2947034c9cb8))
* **migration:** add support for first basic options on new schema ([d891628](https://github.com/db-migrate/node-db-migrate/commit/d891628f7c866bfb4babbe8e542e14d9325d1fd2))
* **schemav2:** add foreignKey support on tables ([3dd7158](https://github.com/db-migrate/node-db-migrate/commit/3dd715816645430947dd6f3795da71aa00e8dea2))
* **state:** add state manager and adjust driver functions ([10c3f1a](https://github.com/db-migrate/node-db-migrate/commit/10c3f1af911501da9c70cb377ef4ee2c7110f075))
* **statemanager:** add first edition of state manager ([6dc4d3b](https://github.com/db-migrate/node-db-migrate/commit/6dc4d3bfee73ff825e1a3616a724ec8628b6d719)), closes [#538](https://github.com/db-migrate/node-db-migrate/issues/538)



## [0.11.5](https://github.com/db-migrate/node-db-migrate/compare/v0.11.4...v0.11.5) (2019-01-06)


### Bug Fixes

* **lgtm:** fix errors ([4cd5558](https://github.com/db-migrate/node-db-migrate/commit/4cd55588b40ae39f0c1ead080e6ecabb64afa89e))
* Added warning on plugin loading failure ([fcffd62](https://github.com/db-migrate/node-db-migrate/commit/fcffd62bad8373ecd09692cf55d79ab588d552be))
* **db:** set exit code as 1 only on error ([3148cc9](https://github.com/db-migrate/node-db-migrate/commit/3148cc9663231d6c75204ef735640c9e26cf0923))



## [0.11.4](https://github.com/db-migrate/node-db-migrate/compare/v0.11.3...v0.11.4) (2018-11-02)



## [0.11.3](https://github.com/db-migrate/node-db-migrate/compare/v0.11.2...v0.11.3) (2018-09-08)


### Bug Fixes

* **db:** create and drop always result in exit code 1 ([d32644c](https://github.com/db-migrate/node-db-migrate/commit/d32644cb145378fdb57c16aafccc7da2a9a4ebe4)), closes [#550](https://github.com/db-migrate/node-db-migrate/issues/550)



## [0.11.2](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0...v0.11.2) (2018-09-05)


### Bug Fixes

* Update dependency `rc` to latest version ([b343add](https://github.com/db-migrate/node-db-migrate/commit/b343add87838fe6a94343f5df9ff7b2e9f6a3f4c))
* update vulnerable pack 'deep-extend' and OOD deps ([8e13c7f](https://github.com/db-migrate/node-db-migrate/commit/8e13c7f770765c92f0f7f17027de78f40126f0fb))
* **check:** fix check via API not passing results to the callback ([b743696](https://github.com/db-migrate/node-db-migrate/commit/b74369687a126062fcef68b57a7098f1cb78434f))
* **ci:** add ignores for backported features ([21c3eb9](https://github.com/db-migrate/node-db-migrate/commit/21c3eb9895853a6175654479a60512faec776907))
* **db:** wrong reference to connect causes db:create to fail ([991ee76](https://github.com/db-migrate/node-db-migrate/commit/991ee7633e9d606f89557c4f3e76e0d5d42349db)), closes [#520](https://github.com/db-migrate/node-db-migrate/issues/520)
* **exitCode:** wrong check for existence fixed ([3c6fc33](https://github.com/db-migrate/node-db-migrate/commit/3c6fc33683831d7135f60ed6c0e4f7437e29cea1))
* **exitCode:** wrong exit code on db methods ([486cb78](https://github.com/db-migrate/node-db-migrate/commit/486cb78bd53a0683ac59f3c53fbc5b0c7a5fc8e4)), closes [#534](https://github.com/db-migrate/node-db-migrate/issues/534)
* **insert:** add missing insert entry to interface ([7ca2f56](https://github.com/db-migrate/node-db-migrate/commit/7ca2f56283adf37e7da84cd03c03a7e8f4ea1c02)), closes [#542](https://github.com/db-migrate/node-db-migrate/issues/542)
* **log:** error ended up in unreadable errors ([16512f6](https://github.com/db-migrate/node-db-migrate/commit/16512f60fda4c12923229e377d58eb5cbb084661)), closes [#524](https://github.com/db-migrate/node-db-migrate/issues/524) [#521](https://github.com/db-migrate/node-db-migrate/issues/521)
* **progamableApi:** cmdOptions get passed into setDefaultArgv now ([cb88b58](https://github.com/db-migrate/node-db-migrate/commit/cb88b5895a89e37baef4a0fbc6d43806e510b531))
* **reset:** regression introduced in check functionality ([b94db96](https://github.com/db-migrate/node-db-migrate/commit/b94db96ba7366241e65230a4f14227c2fd6edf55)), closes [#552](https://github.com/db-migrate/node-db-migrate/issues/552)
* **switchDatabase:** no error was thrown on scope switch ([392d88c](https://github.com/db-migrate/node-db-migrate/commit/392d88c5e12d3785f669454dc76729a2455ad147)), closes [#470](https://github.com/db-migrate/node-db-migrate/issues/470)


### Features

* **check:** add check functionality to determine migrations to run ([56acdb9](https://github.com/db-migrate/node-db-migrate/commit/56acdb985e5bd643e18c6ac4248448e6f70892d5))
* **contribution:** enrich contribution instructions ([2cd0578](https://github.com/db-migrate/node-db-migrate/commit/2cd0578f20cfee0a1b2b0b311e07f81fb7366e98)), closes [#549](https://github.com/db-migrate/node-db-migrate/issues/549)
* **contribution:** enrich contribution instructions, issues ([5ee386b](https://github.com/db-migrate/node-db-migrate/commit/5ee386b423e3a91ef25eb294a516552506a441f2))
* **issuetemplate:** added a github issue template ([3c0fcbf](https://github.com/db-migrate/node-db-migrate/commit/3c0fcbf65f89287ef2431a2c2b7802ca8ffa336b))
* **progamableApi:** CMD options can be passed programatically now ([fd8562e](https://github.com/db-migrate/node-db-migrate/commit/fd8562e4b1369018f6762cd7e999f132c11e4d18))
* **progamableApi:** using const now ([d761ebf](https://github.com/db-migrate/node-db-migrate/commit/d761ebf53d0a922ee8e98bb308a7911bf37de08d))



# [0.10.0](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0-beta.6...v0.10.0) (2017-11-22)


### Bug Fixes

* **api:** add missing reference to sync ([a2522a2](https://github.com/db-migrate/node-db-migrate/commit/a2522a2c8a6a9517cd582dce994913f32f59f1b4))
* **api:** callback called twice ([67ac66a](https://github.com/db-migrate/node-db-migrate/commit/67ac66af80c78b89e754a50309fa0ee3f3a51a6d)), closes [#343](https://github.com/db-migrate/node-db-migrate/issues/343)
* **api:** callback not called on run ([68f4d89](https://github.com/db-migrate/node-db-migrate/commit/68f4d89ee5cfb6cca1cf6aa5379d70b58697e908))
* **api:** fix introduced undefined behavior of specified configs ([9df704e](https://github.com/db-migrate/node-db-migrate/commit/9df704e838c198b5eff355d2374369c16945d5d9))
* **api:** fix race condition on create migration ([67a0f61](https://github.com/db-migrate/node-db-migrate/commit/67a0f611a30eadba149c843abaee4f1f775c7ae6)), closes [#376](https://github.com/db-migrate/node-db-migrate/issues/376)
* **api:** fix scoping ([d6cf5d4](https://github.com/db-migrate/node-db-migrate/commit/d6cf5d4194c4680c6172e5f19f0410866f4c7a1a)), closes [#409](https://github.com/db-migrate/node-db-migrate/issues/409)
* **args:** dont parse when called as module ([ec24db4](https://github.com/db-migrate/node-db-migrate/commit/ec24db40943c92e40f67ecc3cb0e39446cd85537)), closes [#449](https://github.com/db-migrate/node-db-migrate/issues/449)
* **config:** Don't throw if environment variable is empty ([c9c49d0](https://github.com/db-migrate/node-db-migrate/commit/c9c49d09fa5030f11bd3b551fc8265149ecdcce4)), closes [#411](https://github.com/db-migrate/node-db-migrate/issues/411)
* **create:** Fix create when using db-migrate as module ([2829058](https://github.com/db-migrate/node-db-migrate/commit/28290589cee61efca6613080d7a6896257cd1a5d)), closes [#485](https://github.com/db-migrate/node-db-migrate/issues/485) [#493](https://github.com/db-migrate/node-db-migrate/issues/493)
* **create:** use same timestamp in every created file ([f7c28c1](https://github.com/db-migrate/node-db-migrate/commit/f7c28c133607a0d5c1ae767a7fd4f01f3c78d4c4))
* **errorhandling:** Add missing error assertion in executeDB ([376fdc3](https://github.com/db-migrate/node-db-migrate/commit/376fdc3183bcc3f81364e7bfd282d782ff6d597a)), closes [#381](https://github.com/db-migrate/node-db-migrate/issues/381)
* **plugin:** use correct path to include plugins ([f8039f3](https://github.com/db-migrate/node-db-migrate/commit/f8039f33fa0d48a329eb74c4cecf59388dead775))
* **resolve:** Check if resolved version has plugin support ([b681257](https://github.com/db-migrate/node-db-migrate/commit/b681257cefe2c35e743d5173d3afc95c610b0f0a)), closes [#425](https://github.com/db-migrate/node-db-migrate/issues/425)
* **template:** fix unnoticed error introduced in the last merge request ([3480e7a](https://github.com/db-migrate/node-db-migrate/commit/3480e7ab8d02a3899051aa838ba5beb9d0082fe8))
* **test:** Stub MySQL connect method instead of calling the original ([8d1b978](https://github.com/db-migrate/node-db-migrate/commit/8d1b9789cf5b894be3c2ce11771dcb4cb72d0719)), closes [#348](https://github.com/db-migrate/node-db-migrate/issues/348)
* **tests:** fix breaking tests ([335dea1](https://github.com/db-migrate/node-db-migrate/commit/335dea1f10d915fbed8d849bca0f38c0e48e3da3))
* **transitioner:** add new parser internal to transitioner ([a26b6fd](https://github.com/db-migrate/node-db-migrate/commit/a26b6fd545480dac70c40b4b1d7d7ff36590d89a))
* **transitioner:** catch whitespaces properly ([18eb4a6](https://github.com/db-migrate/node-db-migrate/commit/18eb4a63b37223bbf4bb6b5a00a08d167d3ed813))


### Features

* **api:** promisify all current api methods ([3fca510](https://github.com/db-migrate/node-db-migrate/commit/3fca5102a893bde43b5de749278728b906486595))
* **config:** add rc style configs ([b5e7c80](https://github.com/db-migrate/node-db-migrate/commit/b5e7c80a833c4e8eb0ef24838d810d393015a2c9)), closes [#308](https://github.com/db-migrate/node-db-migrate/issues/308) [#406](https://github.com/db-migrate/node-db-migrate/issues/406)
* **config:** helper to overwrite and extend configuration ([8be9215](https://github.com/db-migrate/node-db-migrate/commit/8be9215786e278ba9f29d3b8244545cd890a8cfd)), closes [#349](https://github.com/db-migrate/node-db-migrate/issues/349) [db-migrate/pg#8](https://github.com/db-migrate/pg/issues/8) [#488](https://github.com/db-migrate/node-db-migrate/issues/488) [#463](https://github.com/db-migrate/node-db-migrate/issues/463)
* **hook:** parser hook and transitioner api ([a924436](https://github.com/db-migrate/node-db-migrate/commit/a924436c79c534422b8d14e77d9a4d08c5be38cf)), closes [#403](https://github.com/db-migrate/node-db-migrate/issues/403) [#397](https://github.com/db-migrate/node-db-migrate/issues/397)
* **plugin:** add basic plugin support ([1d2ee9e](https://github.com/db-migrate/node-db-migrate/commit/1d2ee9e9f974596cbd26a4637d5e94450af6424c)), closes [#397](https://github.com/db-migrate/node-db-migrate/issues/397) [#396](https://github.com/db-migrate/node-db-migrate/issues/396)
* **plugins:** add basic support for plugins and improve performance ([2ad22b1](https://github.com/db-migrate/node-db-migrate/commit/2ad22b1cef457155772daaef6d7b9ffc8d2edfb0)), closes [#397](https://github.com/db-migrate/node-db-migrate/issues/397)
* **sync:** add sync mode ([fa1a161](https://github.com/db-migrate/node-db-migrate/commit/fa1a1611880a877d9b57060d035af7f0e5d91443)), closes [#383](https://github.com/db-migrate/node-db-migrate/issues/383) [#313](https://github.com/db-migrate/node-db-migrate/issues/313) [#222](https://github.com/db-migrate/node-db-migrate/issues/222)
* **transitioner:** add transitioner to easen the process of protocol changes ([cd23b42](https://github.com/db-migrate/node-db-migrate/commit/cd23b42359272624b3e122c9750f6769d594bf9b)), closes [#403](https://github.com/db-migrate/node-db-migrate/issues/403)



# [0.10.0-beta.6](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0-beta.5...v0.10.0-beta.6) (2015-12-03)



# [0.10.0-beta.5](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0-beta.4...v0.10.0-beta.5) (2015-12-03)



# [0.10.0-beta.4](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0-beta.3...v0.10.0-beta.4) (2015-10-20)



# [0.10.0-beta.3](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0-beta.2...v0.10.0-beta.3) (2015-10-19)



# [0.10.0-beta.2](https://github.com/db-migrate/node-db-migrate/compare/v0.10.0-beta.1...v0.10.0-beta.2) (2015-10-19)



# [0.10.0-beta.1](https://github.com/db-migrate/node-db-migrate/compare/v0.9.12...v0.10.0-beta.1) (2015-10-17)



## [0.9.12](https://github.com/db-migrate/node-db-migrate/compare/v0.9.11...v0.9.12) (2015-04-02)



## [0.9.11](https://github.com/db-migrate/node-db-migrate/compare/v0.9.10...v0.9.11) (2015-03-22)



## [0.9.10](https://github.com/db-migrate/node-db-migrate/compare/v0.9.9...v0.9.10) (2015-03-17)



## [0.9.9](https://github.com/db-migrate/node-db-migrate/compare/v0.9.8...v0.9.9) (2015-03-12)



## [0.9.8](https://github.com/db-migrate/node-db-migrate/compare/v0.9.7...v0.9.8) (2015-03-06)



## [0.9.7](https://github.com/db-migrate/node-db-migrate/compare/v0.9.6...v0.9.7) (2015-02-25)



## [0.9.6](https://github.com/db-migrate/node-db-migrate/compare/v0.9.5...v0.9.6) (2015-02-25)



## [0.9.5](https://github.com/db-migrate/node-db-migrate/compare/v0.9.4...v0.9.5) (2015-02-24)



## [0.9.4](https://github.com/db-migrate/node-db-migrate/compare/v0.9.3...v0.9.4) (2015-02-24)



## [0.9.3](https://github.com/db-migrate/node-db-migrate/compare/v0.9.2...v0.9.3) (2015-02-22)



## [0.9.2](https://github.com/db-migrate/node-db-migrate/compare/v0.9.1...v0.9.2) (2015-02-14)



## [0.9.1](https://github.com/db-migrate/node-db-migrate/compare/v0.9.0...v0.9.1) (2015-02-14)



# [0.9.0](https://github.com/db-migrate/node-db-migrate/compare/v0.8.0...v0.9.0) (2015-02-13)



# [0.8.0](https://github.com/db-migrate/node-db-migrate/compare/v0.7.1...v0.8.0) (2014-11-25)



## [0.7.1](https://github.com/db-migrate/node-db-migrate/compare/v0.7.0...v0.7.1) (2014-08-05)



# [0.7.0](https://github.com/db-migrate/node-db-migrate/compare/v0.6.4...v0.7.0) (2014-08-01)



## [0.6.4](https://github.com/db-migrate/node-db-migrate/compare/v0.6.3...v0.6.4) (2014-02-17)



## [0.6.3](https://github.com/db-migrate/node-db-migrate/compare/v0.6.2...v0.6.3) (2013-11-25)



## [0.6.2](https://github.com/db-migrate/node-db-migrate/compare/v0.6.1...v0.6.2) (2013-10-08)



## [0.6.1](https://github.com/db-migrate/node-db-migrate/compare/v0.6.0...v0.6.1) (2013-09-20)



# [0.6.0](https://github.com/db-migrate/node-db-migrate/compare/v0.5.4...v0.6.0) (2013-09-13)



## [0.5.4](https://github.com/db-migrate/node-db-migrate/compare/v0.5.3...v0.5.4) (2013-07-13)



## [0.5.3](https://github.com/db-migrate/node-db-migrate/compare/v0.5.2...v0.5.3) (2013-07-10)



## [0.5.2](https://github.com/db-migrate/node-db-migrate/compare/v0.5.1...v0.5.2) (2013-06-16)



## [0.5.1](https://github.com/db-migrate/node-db-migrate/compare/v0.5.0...v0.5.1) (2013-06-05)



# [0.5.0](https://github.com/db-migrate/node-db-migrate/compare/v0.4.2...v0.5.0) (2013-06-03)



## [0.4.2](https://github.com/db-migrate/node-db-migrate/compare/v0.4.1...v0.4.2) (2013-04-29)



## [0.4.1](https://github.com/db-migrate/node-db-migrate/compare/v0.4.0...v0.4.1) (2013-03-06)



# [0.4.0](https://github.com/db-migrate/node-db-migrate/compare/v0.3.2...v0.4.0) (2013-02-28)



## [0.3.1](https://github.com/db-migrate/node-db-migrate/compare/v0.3.0...v0.3.1) (2013-01-28)



# [0.3.0](https://github.com/db-migrate/node-db-migrate/compare/v0.2.8...v0.3.0) (2013-01-22)



## [0.2.8](https://github.com/db-migrate/node-db-migrate/compare/v0.2.7...v0.2.8) (2012-12-07)



## [0.2.7](https://github.com/db-migrate/node-db-migrate/compare/v0.2.6...v0.2.7) (2012-11-17)



## [0.2.6](https://github.com/db-migrate/node-db-migrate/compare/v0.2.5...v0.2.6) (2012-10-30)



## [0.2.5](https://github.com/db-migrate/node-db-migrate/compare/v0.2.4...v0.2.5) (2012-10-10)



## [0.2.4](https://github.com/db-migrate/node-db-migrate/compare/v0.2.3...v0.2.4) (2012-09-17)



## [0.2.3](https://github.com/db-migrate/node-db-migrate/compare/v0.2.2...v0.2.3) (2012-08-29)



## [0.2.2](https://github.com/db-migrate/node-db-migrate/compare/v0.2.1...v0.2.2) (2012-08-28)



## [0.2.1](https://github.com/db-migrate/node-db-migrate/compare/v0.2.0...v0.2.1) (2012-08-15)



# [0.2.0](https://github.com/db-migrate/node-db-migrate/compare/v0.1.5...v0.2.0) (2012-08-03)



## [0.1.5](https://github.com/db-migrate/node-db-migrate/compare/v0.1.4...v0.1.5) (2012-07-12)



## [0.1.4](https://github.com/db-migrate/node-db-migrate/compare/v0.1.3...v0.1.4) (2012-07-09)



## [0.1.3](https://github.com/db-migrate/node-db-migrate/compare/v0.1.2...v0.1.3) (2012-06-09)



## [0.1.2](https://github.com/db-migrate/node-db-migrate/compare/v0.1.1...v0.1.2) (2012-06-06)



## [0.1.1](https://github.com/db-migrate/node-db-migrate/compare/v0.1.0...v0.1.1) (2012-06-05)



# [0.1.0](https://github.com/db-migrate/node-db-migrate/compare/v0.0.6...v0.1.0) (2012-05-30)



## [0.0.6](https://github.com/db-migrate/node-db-migrate/compare/v0.0.5...v0.0.6) (2012-04-02)



## [0.0.5](https://github.com/db-migrate/node-db-migrate/compare/v0.0.4...v0.0.5) (2012-03-02)



## [0.0.4](https://github.com/db-migrate/node-db-migrate/compare/v0.0.3...v0.0.4) (2012-02-02)



## [0.0.3](https://github.com/db-migrate/node-db-migrate/compare/v0.0.2...v0.0.3) (2012-01-03)



## 0.0.2 (2011-12-31)



