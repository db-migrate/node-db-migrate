'use strict';

var log = require('db-migrate-shared').log;
var optimist = require('optimist');
var load = require('./');
var transition = load('transition');
Promise = require('bluebird');

function run (internals, config, callback) {
  var action = internals.argv._.shift();
  var folder = action.split(':');

  action = folder[0];
  var toExecute = null;

  switch (action) {
    case 'transition':
      transition(internals);
      break;
    case 'create':
      if (folder[1]) {
        internals.matching = folder[1];
        internals.migrationMode = folder[1];
      }
      toExecute = load('create-migration');
      break;
    case 'sync':
      toExecute = load('sync');

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

      break;
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
        toExecute = load('up');
      } else {
        toExecute = load('down');
      }
      break;

    case 'db':
      if (folder.length < 1) {
        log.info('Please enter a valid command, i.e. db:create|db:drop');
      } else {
        internals.mode = folder[1];
        toExecute = load('db');
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
        toExecute = load('undo-seed');
      } else {
        toExecute = load('seed');
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
          'Invalid Action: Must be [up|down|create|reset|sync|' +
            'db|transition].'
        );
        optimist.showHelp();
        process.exit(1);
      }
      break;
  }

  if (toExecute) {
    toExecute(internals, config, callback);
  } else {
    callback();
  }
}

module.exports = run;
