var Seed = require('./seed');
var log = require('./log');

Seeder = function (driver, seedsDir, versionControlled) {
  this.driver = driver;
  this.seedDir = seedsDir;
  this.isVC = versionControlled;
};

Seeder.prototype = {

  seed: function () {

    if (this.isVC)
      this.up();
    else
      this._staticSeed();
  },

  up: function () {

  },

  down: function () {

  },

  /**
    * Statically call two methods from a static seeder.
    *
    * First: cleanSeeds
    * Second: seed
    *
    * It's highly recommended to not use version controlled seeders at the same
    * time as statics. While the cleanSeeds most of the time, the user executes
    * truncates or deletes on his database. A VC-Seeder can't detect this
    * and thus the state keeps the same, even if all changes of the VC-Seeder
    * are gone.
    *
    * Nevertheless, there is a possiblity to use static seeders together with
    * VC-Seeder, if you keep everything organized well at least.
    *
    * If a single seed is linked with it's tables and databases which it got
    * applied to, the state table of the seeds will automatically cleaned up.
    *
    */
  _staticSeed: function () {
  }
};