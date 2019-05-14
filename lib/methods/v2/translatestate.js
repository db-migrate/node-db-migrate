const Promise = require('bluebird');
const State = require('../../state');

const f = {
  createTable: async (driver, [t], internals) => {
    // console.log(t, internals.modSchema, internals.modSchema.c[t]);
    return driver.createTable(t, internals.modSchema.c[t]);
  }
};

async function processEntry (
  context,
  file,
  driver,
  internals,
  { t: type, a: action, c: args }
) {
  // console.log('hello', type, action, args);
  switch (type) {
    case 0:
      await driver[action].apply(driver, args);
      break;
    case 1:
      await f[action](driver, args, internals);
      break;

    default:
      throw new Error(`Invalid state record, of type ${type}`);
  }

  internals.modSchema.s.shift();
  await State.update(context, file, internals.modSchema, internals);
}
module.exports = async (context, file, driver, internals) => {
  const mod = internals.modSchema;

  await Promise.resolve(mod.s).each(args =>
    processEntry(context, file, driver, internals, args)
  );

  await State.deleteState(context, file, internals);
};
