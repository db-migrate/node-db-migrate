const Shadow = require('../../driver/shadow');
const State = require('../../state');

/**
 * Records a step as done, after it was executed on the database.
 */
module.exports = {
  getInterface: (context, file, driver, internals, pdriver) => {
    const done = () =>
      function () {
        return State.done(pdriver, internals.migrationOp, internals);
      };

    return Shadow.overshadow(driver, {}, done);
  }
};
