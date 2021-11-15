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



