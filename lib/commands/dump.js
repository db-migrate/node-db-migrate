const path = require('path');
const log = require('db-migrate-shared').log;

async function prepare (internals, config) {
  const index = require('../../connect');

  return index.driver({
    config: config.getCurrent().settings,
    internals: internals
  });
}

module.exports = async function (internals, config) {
  const driver = await prepare(internals, config);

  try {
    const res = await driver.backupGet(internals.argv);
    return internals.onComplete(driver, internals, null, res);
  } catch (err) {
    return internals.onComplete(driver, internals, err);
  }
};
