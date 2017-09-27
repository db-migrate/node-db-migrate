var Code = require('code');
var Lab = require('lab');
var path = require('path');
var proxyquire = require('proxyquire').noPreserveCache();
var lab = exports.lab = Lab.script();
var Migration = require('../lib/migration.js');

var date = createDateForTest();
var dateString = '20140220143050';
var dirName = path.join('directory', 'name');
var fileNameNoExtension = 'filename';
var fileName = 'filename.js';
var templateType = Migration.TemplateType.SQL_FILE_LOADER;

var internals = {};
internals.migrationTable = 'migrations';

lab.experiment('migration', { parallel: true }, function() {

  lab.experiment('when creating a new migration object', { parallel: true },
    newMigrationObject);

  lab.experiment('get template', { parallel: true },
    getTemplate);

  lab.experiment('when using db-migrate as module', { parallel: true },
    asModule);
});

function asModule() {
  lab.test('should create migration', function (done) {

    var dbmigrate = stubApiInstance(true, {}, {});
    dbmigrate.setConfigParam('_',[]);
    
    dbmigrate.create('migrationName').then(done);
  });
}

function newMigrationObject() {

  lab.experiment('with 2 parameters as the complete filepath',
    { parallel: true }, function() {

    var migration = new Migration(path.join(dirName, dateString+'-'+fileName), internals);

    lab.test('should have title set without file extension', { parallel: true },
      function(done) {

      Code.expect(migration.title).to.equal(fileNameNoExtension);
      done();
    });

    lab.test('should have date set', { parallel: true },
      function(done) {

      migration.date.setMilliseconds(0);
      date.setMilliseconds(0);
      Code.expect(migration.date.getTime()).to.equal(date.getTime());
      done();
    });

    lab.test('should have name set without file extension', { parallel: true },
      function(done) {

      Code.expect(migration.name).to.equal(dateString+'-'+fileNameNoExtension);
      done();
    });

    lab.test('should have path set', { parallel: true },
      function(done) {

      Code.expect(migration.path).to.equal(path.join(dirName, dateString+'-'+fileName));
      done();
    });

    lab.test('should have templateType not set', { parallel: true },
      function(done) {

      Code.expect(migration.templateType).to.be.undefined();
      done();
    });
  });

  lab.experiment('with 3 parameters', { parallel: true }, function() {

    var migration = new Migration(fileName, dirName, date);

    lab.test('should have title set', { parallel: true },
      function(done) {

      Code.expect(migration.title).to.equal(fileName);
      done();
    });

    lab.test('should have date set with month', { parallel: true },
      function(done) {

      Code.expect(migration.date).to.equal(date);
      done();
    });

    lab.test('should have name set', { parallel: true },
      function(done) {

      Code.expect(migration.name).to.equal(dateString+'-'+fileName);
      done();
    });

    lab.test('should have path set', { parallel: true },
      function(done) {

      Code.expect(migration.path).to.equal(path.join(dirName, dateString+'-'+fileName));
      done();
    });

    lab.test('should have templateType not set', { parallel: true },
      function(done) {

      Code.expect(migration.templateType).to.be.undefined();
      done();
    });
  });

  lab.experiment('with 5 parameters', { parallel: true }, function() {

    var migration = new Migration(fileName, dirName, date, templateType,
      internals);

    lab.test('should have title set', { parallel: true },
      function(done) {

      Code.expect(migration.title).to.equal(fileName);
      done();
    });

    lab.test('should have date set', { parallel: true },
      function(done) {

      Code.expect(migration.date).to.equal(date);
      done();
    });

    lab.test('should have name set', { parallel: true },
      function(done) {

      Code.expect(migration.name).to.equal(dateString+'-'+fileName);
      done();
    });

    lab.test('should have path set', { parallel: true },
      function(done) {

      Code.expect(migration.path).to.equal(path.join(dirName, dateString+'-'+fileName));
      done();
    });

    lab.test('should have templateType set', { parallel: true },
      function(done) {

      Code.expect(migration.templateType).to.equal(templateType);
      done();
    });
  });
}

function getTemplate() {

  lab.experiment('when template type is not set', { parallel: true },
    function() {

    var migration = new Migration(fileName, dirName, date, internals);

    lab.test('should return default javascript template', { parallel: true },
      function(done) {

      var actual = migration.getTemplate();
      Code.expect(actual).to.equal(migration.defaultJsTemplate());
      done();
    });
  });

  lab.experiment('when template type is set', { parallel: true },
    function() {

    lab.experiment('as sql file loader', { parallel: true }, function() {

      var migration = new Migration(fileName, dirName, date,
        Migration.TemplateType.SQL_FILE_LOADER, internals);

      lab.test('should return sql file loader template', { parallel: true },
        function(done) {

        var actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.sqlFileLoaderTemplate());
        done();
      });
    });

    lab.experiment('as default sql', { parallel: true }, function() {

      var migration = new Migration(fileName, dirName, date,
        Migration.TemplateType.DEFAULT_SQL, internals);

      lab.test('should return default sql template', { parallel: true },
        function(done) {

        var actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultSqlTemplate());
        done();
      });
    });

    lab.experiment('as default coffee', { parallel: true }, function() {

      var migration = new Migration(fileName, dirName, date,
        Migration.TemplateType.DEFAULT_COFFEE, internals);

      lab.test('should return default coffee template', { parallel: true },
        function(done) {

        var actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultCoffeeTemplate());
        done();
      });
    });

    lab.experiment('as coffee sql loader', { parallel: true }, function() {

      var migration = new Migration(fileName, dirName, date,
        Migration.TemplateType.COFFEE_SQL_FILE_LOADER, internals);

      lab.test('should return default coffee template', { parallel: true },
        function(done) {

        var actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.coffeeSqlFileLoaderTemplate());
        done();
      });
    });

    lab.experiment('as default javascript', { parallel: true }, function() {

      var migration = new Migration(fileName, dirName, date,
        Migration.TemplateType.DEFAULT_JS, internals);

      lab.test('should return default sql template', { parallel: true },
        function(done) {

        var actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultJsTemplate());
        done();
      });
    });
  });
}

function stubApiInstance(isModule, stubs, options, callback) {

  delete require.cache[require.resolve('../api.js')];
  delete require.cache[require.resolve('optimist')];
  var mod = proxyquire('../api.js', stubs),
    plugins = {};
  options = options || {};

  options = Object.assign(options, {
    throwUncatched: true,
    cwd: __dirname
  });

  return new mod(plugins, isModule, options, callback);
}

function createDateForTest() {
  var date = new Date();
  date.setUTCFullYear(2014);
  date.setUTCDate('20');
  date.setUTCMonth('01');
  date.setUTCHours('14');
  date.setUTCMinutes('30');
  date.setUTCSeconds('50');
  return date;
}
