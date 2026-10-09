'use strict';

const migrationHook = require('./helper/migration-hook.js');
const executeWork = require('../work');

/**
 * Runs the jobs of background migrations, returns { done, stop }.
 */
module.exports = function (internals, config, options) {
  let worker = null;
  let stopped = false;

  const done = Promise.resolve(migrationHook(internals)).then(() => {
    if (stopped) {
      return { done: [], failed: [] };
    }

    worker = executeWork(internals, config, options);
    return worker.done;
  });

  return {
    done,
    stop: () => {
      stopped = true;
      if (worker) {
        worker.stop();
      }

      return done;
    }
  };
};
