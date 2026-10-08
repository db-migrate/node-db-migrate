'use strict';

var log = require('db-migrate-shared').log;
var yargs = require('yargs');
var formatError = require('../format-error');

/**
 * Print a failed command once, with the context of the failure, and exit.
 */
function report (result) {
  return Promise.resolve(result).catch(function (err) {
    log.error(formatError(err, { verbose: global.verbose }));
    process.exit(1);
  });
}

function run (internals, config) {
  const { load } = internals;
  var action = internals.argv._.shift();
  var folder = action.split(':');

  action = folder[0];

  switch (action) {
    case 'create':
      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }
      report(load('create-migration')(internals, config));
      break;
    case 'sync':
      var executeSync = load('sync');

      if (internals.argv._.length === 0) {
        log.error('Missing sync destination!');
        process.exit(1);
      }

      internals.argv.count = Number.MAX_VALUE;
      internals.argv.destination = internals.argv._.shift().toString();

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }

      report(executeSync(internals, config));
      break;
    case 'fix':
    case 'up':
    case 'down':
    case 'reset':
      if (action === 'reset') internals.argv.count = Number.MAX_VALUE;

      if (internals.argv._.length > 0) {
        if (action === 'down') {
          internals.argv.count = internals.argv.count || Number.MAX_VALUE;
          internals.argv.destination = internals.argv._.shift().toString();
        } else {
          internals.argv.destination = internals.argv._.shift().toString();
        }
      }

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }

      if (action === 'up') {
        var executeUp = load('up');
        report(executeUp(internals, config));
      } else if (action === 'fix') {
        var executeFix = load('fix');
        report(executeFix(internals, config));
      } else {
        var executeDown = load('down');
        report(executeDown(internals, config));
      }
      break;

    case 'check':
      var executeCheck = load('check');

      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }

      report(executeCheck(internals, config));
      break;
    case 'db':
      if (folder.length < 1) {
        log.info('Please enter a valid command, i.e. db:create|db:drop');
      } else {
        internals.mode = folder[1];
        report(load('db')(internals, config));
      }
      break;
    case 'seed':
      internals.mode = folder[1] || 'vc';
      internals.migrationMode = folder[2];

      if (internals.argv._[0] === 'down' || internals.argv._[0] === 'reset') {
        if (internals.argv._[0] === 'reset') {
          internals.argv.count = Number.MAX_VALUE;
        }

        internals.argv._.shift();
        report(load('undo-seed')(internals, config));
      } else {
        report(load('seed')(internals, config));
      }
      break;

    default:
      var plugins = internals.plugins;
      var plugin = plugins.overwrite(
        'run:default:action:' + action + ':overwrite'
      );
      if (plugin) {
        plugin['run:default:action:' + action + ':overwrite'](
          internals,
          config
        );
      } else {
        log.error(
          'Invalid Action: Must be [up|down|check|create|reset|sync|db].'
        );
        yargs.showHelp();
        process.exit(1);
      }
      break;
  }
}

module.exports = run;
