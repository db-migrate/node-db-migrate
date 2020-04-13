'use strict';

function isPromise (probe) {
  return (
    probe instanceof Promise ||
    (probe &&
      probe.then &&
      probe.constructor &&
      probe.constructor.name === 'Promise')
  );
}

/**
 * Backwards compatibility function.
 *
 * This ensures old migrations can still be executed by allowing them
 * to still use callbacks or promises. This function ensures that every
 * execution context may be returned only once (since callbacks can be called
 * multiple times) and is basically FI(-only-)FO function.
 */
function maybePromised (context, action, params) {
  let cbExecuted = false;

  return new Promise((resolve, reject) => {
    const r = err => {
      if (cbExecuted === false) {
        cbExecuted = true;

        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    };

    params[params.length++] = r;

    if (typeof action === 'function') action = action.apply(context, params);
    if (action === null) action = Promise.resolve();

    if (isPromise(action)) {
      action
        .then(() => {
          if (cbExecuted === false) {
            cbExecuted = true;
            resolve();
          }
        })
        .catch(err => {
          if (cbExecuted === false) {
            cbExecuted = true;
            reject(err);
          }
        });
    }
  });
}

module.exports = {
  maybePromised: maybePromised
};
