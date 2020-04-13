const Shadow = require('../../driver/shadow');

class AddConventions {
  constructor (internals, file, driver) {
    this.file = file;
    this.internals = internals;
    this.driver = driver;
    this._counter = 0;
  }

  createTable (t, d) {
    d.__dbmigrate__flag = {
      type: 'string'
    };

    return Promise.resolve();
  }

  createCollection (...args) {
    return this.createTable.apply(this, args);
  }
}

const noAction = prop => {
  return function () {
    return Promise.resolve();
  };
};

module.exports = {
  getInterface: (context, file, driver, internals) => {
    if (context.conventions) {
      const st = new AddConventions(internals, file, context);
      return Shadow.overshadow(
        driver,
        Object.assign(st, context.conventions),
        noAction
      );
    }

    return Shadow.overshadow(
      driver,
      new AddConventions(internals, file, context),
      noAction
    );
  }
};
