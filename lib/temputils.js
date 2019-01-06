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
