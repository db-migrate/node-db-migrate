var fs = require('fs');
var path = require('path');
var log = require('db-migrate-shared').log;
var Skeleton = require('./skeleton');
var Promise = require('bluebird');

var filesRegEx = /\.js$/;

var Migration = Skeleton.extend({
  init: function () {
    if (arguments.length >= 3) {
      this.title = arguments[0];
      this.date = arguments[2];
      this.name = this.formatName(this.title, this.date);
      this.path = this.formatPath(arguments[1], this.name);
      this.templateType = arguments[3];
      this.internals = arguments[4];
    } else if (arguments.length === 2) {
      this.path = arguments[0];
      this.name = this.parseName(this.path);
      this.date = this.parseDate(this.name);
      this.title = this.parseTitle(this.name);
      this.internals = arguments[1];
    }

    this._super(this.internals);
  }
});

Migration.registerHook = function (Plugin, internals) {
  var plugin = Plugin.hook('migrator:migration:hook:require');
  internals.parser = internals.parser || {
    filesRegEx: filesRegEx,
    extensions: 'js'
  };

  if (!plugin) {
    return Promise.resolve(null);
  }

  return Promise.resolve(plugin)
    .map(function (plugin) {
      return plugin['migrator:migration:hook:require']();
    })
    .each(function (parser) {
      if (parser && parser.extensions) {
        internals.parser.extensions =
          internals.parser.extensions + '|' + parser.extensions;
      }
    })
    .then(function () {
      internals.parser.filesRegEx = new RegExp(
        '\\.(' + internals.parser.extensions + ')$'
      );

      return internals.parser;
    });
};

Migration.prototype.defaultCoffeeTemplate = function () {
  return [
    "'use strict';",
    '',
    'dbm = undefined',
    'type = undefined',
    'seed = undefined',
    '',
    'exports.setup = (options, seedLink) ->',
    '  dbm = options.dbmigrate',
    '  type = dbm.dataType',
    '  seed = seedLink',
    '',
    'exports.up = (db) ->',
    '  null',
    '',
    'exports.down = (db) ->',
    '  null',
    '',
    ''
  ].join('\n');
};

Migration.prototype.defaultJsTemplate = function () {
  return [
    "'use strict';",
    '',
    'var dbm;',
    'var type;',
    'var seed;',
    '',
    '/**',
    '  * We receive the dbmigrate dependency from dbmigrate initially.',
    '  * This enables us to not have to rely on NODE_PATH.',
    '  */',
    'exports.setup = function(options, seedLink) {',
    '  dbm = options.dbmigrate;',
    '  type = dbm.dataType;',
    '  seed = seedLink;',
    '};',
    '',
    'exports.up = function(db) {',
    '  return null;',
    '};',
    '',
    'exports.down = function(db) {',
    '  return null;',
    '};',
    '',
    'exports._meta = {',
    '  "version": 1',
    '};',
    ''
  ].join('\n');
};

Migration.prototype.defaultSqlTemplate = function () {
  return '/* Replace with your SQL commands */';
};

Migration.prototype.sqlFileLoaderTemplate = function () {
  return [
    "'use strict';",
    '',
    'var dbm;',
    'var type;',
    'var seed;',
    "var fs = require('fs');",
    "var path = require('path');",
    'var Promise;',
    '',
    '/**',
    '  * We receive the dbmigrate dependency from dbmigrate initially.',
    '  * This enables us to not have to rely on NODE_PATH.',
    '  */',
    'exports.setup = function(options, seedLink) {',
    '  dbm = options.dbmigrate;',
    '  type = dbm.dataType;',
    '  seed = seedLink;',
    '  Promise = options.Promise;',
    '};',
    '',
    'exports.up = function(db) {',
    "  var filePath = path.join(__dirname, 'sqls', '" +
      this.name.replace('.js', '') +
      "-up.sql');",
    '  return new Promise( function( resolve, reject ) {',
    "    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){",
    '      if (err) return reject(err);',
    "      console.log('received data: ' + data);",
    '',
    '      resolve(data);',
    '    });',
    '  })',
    '  .then(function(data) {',
    '    return db.runSql(data);',
    '  });',
    '};',
    '',
    'exports.down = function(db) {',
    "  var filePath = path.join(__dirname, 'sqls', '" +
      this.name.replace('.js', '') +
      "-down.sql');",
    '  return new Promise( function( resolve, reject ) {',
    "    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){",
    '      if (err) return reject(err);',
    "      console.log('received data: ' + data);",
    '',
    '      resolve(data);',
    '    });',
    '  })',
    '  .then(function(data) {',
    '    return db.runSql(data);',
    '  });',
    '};',
    '',
    'exports._meta = {',
    '  "version": 1',
    '};',
    ''
  ].join('\n');
};

Migration.prototype.sqlFileLoaderIgnoreOnInitTemplate = function () {
  return [
    "'use strict';",
    '',
    'var dbm;',
    'var type;',
    'var seed;',
    "var fs = require('fs');",
    "var path = require('path');",
    'var ignoreOnInit = false;',
    'var Promise;',
    '',
    '/**',
    '  * We receive the dbmigrate dependency from dbmigrate initially.',
    '  * This enables us to not have to rely on NODE_PATH.',
    '  */',
    'exports.setup = function(options, seedLink) {',
    '  dbm = options.dbmigrate;',
    '  ignoreOnInit = options.ignoreOnInit;',
    '  type = dbm.dataType;',
    '  seed = seedLink;',
    '  Promise = options.Promise;',
    '};',
    '',
    'exports.up = function(db, callback) {',
    "  var filePath = path.join(__dirname + '/sqls/" +
      this.name.replace('.js', '') +
      "-up.sql');",
    '  if (!ignoreOnInit) {',
    '    return new Promise( function( resolve, reject ) {',
    "       fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){",
    '         if (err) return reject(err);',
    "         console.log('received data: ' + data);",
    '',
    '         resolve(data);',
    '       });',
    '    })',
    '    .then(function(data) {',
    '      return db.runSql(data);',
    '    });',
    '  }',
    '  else {',
    "   console.log('ignoring on init: ' + filePath)",
    '   return null;',
    '  }',
    '};',
    '',
    'exports.down = function(db, callback) {',
    "  var filePath = path.join(__dirname + '/sqls/" +
      this.name.replace('.js', '') +
      "-down.sql');",
    '  return new Promise( function( resolve, reject ) {',
    "    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){",
    '      if (err) return reject(err);',
    "      console.log('received data: ' + data);",
    '',
    '      resolve(data);',
    '    });',
    '  })',
    '  .then(function(data) {',
    '    return db.runSql(data);',
    '  });',
    '};',
    '',
    'exports._meta = {',
    '  "version": 1',
    '};',
    ''
  ].join('\n');
};

Migration.prototype.coffeeSqlFileLoaderTemplate = function () {
  return [
    "'use strict';",
    '',
    'dbm = undefined',
    'type = undefined',
    'seed = undefined',
    "fs = require 'fs'",
    "path = require 'path'",
    '',
    '#',
    '# We receive the dbmigrate dependency from dbmigrate initially.',
    '# This enables us to not have to rely on NODE_PATH.',
    '#',
    'exports.setup = (options, seedLink) ->',
    '  dbm = options.dbmigrate',
    '  type = dbm.dataType',
    '  seed = seedLink',
    '',
    '',
    'exports.up = (db, callback) ->',
    '  filePath = path.join "#{__dirname}/sqls/' +
      this.name.replace('.coffee', '') +
      '-up.sql"',
    "  fs.readFile filePath, {encoding: 'utf-8'}, (err,data) ->",
    '    return callback err if err',
    '',
    '    db.runSql data, callback',
    '',
    'exports.down = (db, callback) ->',
    '  filePath = path.join "#{__dirname}/sqls/' +
      this.name.replace('.coffee', '') +
      '-down.sql"',

    "  fs.readFile filePath, {encoding: 'utf-8'}, (err,data) ->",
    '    return callback err if err',
    '',
    '    db.runSql data, callback',
    ''
  ].join('\n');
};

Migration.TemplateType = {
  DEFAULT_JS: 0,
  DEFAULT_SQL: 1,
  SQL_FILE_LOADER: 2,
  DEFAULT_COFFEE: 3,
  COFFEE_SQL_FILE_LOADER: 4,
  SQL_FILE_LOADER_IGNORE_ON_INIT: 5
};

Migration.prototype.getTemplate = function () {
  switch (this.templateType) {
    case Migration.TemplateType.DEFAULT_SQL:
      return this.defaultSqlTemplate();
    case Migration.TemplateType.SQL_FILE_LOADER:
      return this.sqlFileLoaderTemplate();
    case Migration.TemplateType.DEFAULT_COFFEE:
      return this.defaultCoffeeTemplate();
    case Migration.TemplateType.COFFEE_SQL_FILE_LOADER:
      return this.coffeeSqlFileLoaderTemplate();
    case Migration.TemplateType.SQL_FILE_LOADER_IGNORE_ON_INIT:
      return this.sqlFileLoaderIgnoreOnInitTemplate();
    case Migration.TemplateType.DEFAULT_JS:
    /* falls through */
    default:
      return this.defaultJsTemplate();
  }
};

Migration.prototype.write = function (callback) {
  fs.writeFile(this.path, this.getTemplate(), callback);
};

Migration.loadFromFilesystem = function (dir, internals, callback) {
  log.verbose('loading migrations from dir', dir);
  fs.readdir(dir, function (err, files) {
    if (err) {
      callback(err);
      return;
    }
    files = files.filter(function (file) {
      return internals.parser.filesRegEx.test(file);
    });
    var migrations = files.sort().map(function (file) {
      return new Migration(path.join(dir, file), internals);
    });
    callback(null, migrations);
  });
};

Migration.loadFromDatabase = function (dir, driver, internals, callback) {
  if (internals.ignoreCompleted) {
    callback(null, []);
  } else {
    log.verbose('loading migrations from database');
    driver.allLoadedMigrations(function (err, dbResults) {
      if (err && !internals.dryRun) {
        callback(err);
        return;
      } else if (err && internals.dryRun) {
        dbResults = [];
      }
      var migrations = dbResults
        .filter(function (result) {
          return (
            result.name.substr(0, result.name.lastIndexOf('/')) ===
            internals.matching
          );
        })
        .map(function (result) {
          return new Migration(path.join(dir, result.name), internals);
        });

      callback(null, migrations);
    });
  }
};

module.exports = Migration;
