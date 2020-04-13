'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const proxyquire = require('proxyquire').noPreserveCache();
const lab = (exports.lab = Lab.script());
const Migration = require('../lib/file.js');
const Template = require('../lib/template.js');
const Plugins = require('./pluginHelper.js');

const date = createDateForTest();
const dateString = '20140220143050';
const dirName = '/directory/name/';
const fileNameNoExtension = 'filename';
const fileName = 'filename.js';
const templateType = Template.TemplateType.SQL_FILE_LOADER;

const internals = {};
internals.migrationTable = 'migrations';

lab.experiment('migration', function () {
  lab.experiment(
    'when creating a new migration object',

    newMigrationObject
  );

  lab.experiment('get template', getTemplate);

  lab.experiment(
    'when using db-migrate as module',

    asModule
  );
});

function asModule () {
  lab.test('should create migration', async () => {
    const dbmigrate = stubApiInstance(true, {}, {});
    dbmigrate.setConfigParam('_', []);

    await dbmigrate.create('migrationName');
  });
}

function newMigrationObject () {
  lab.experiment(
    'with 2 parameters as the complete filepath',

    function () {
      const migration = new Migration(
        dirName + dateString + '-' + fileName,
        internals
      );

      lab.test('should have title set without file extension', () => {
        Code.expect(migration.title).to.equal(fileNameNoExtension);
      });

      lab.test('should have date set', () => {
        migration.date.setMilliseconds(0);
        date.setMilliseconds(0);
        Code.expect(migration.date.getTime()).to.equal(date.getTime());
      });

      lab.test('should have name set without file extension', () => {
        Code.expect(migration.name).to.equal(
          dateString + '-' + fileNameNoExtension
        );
      });

      lab.test('should have path set', () => {
        Code.expect(migration.path).to.equal(
          dirName + dateString + '-' + fileName
        );
      });

      lab.test('should have templateType not set', () => {
        Code.expect(migration.templateType).to.be.undefined();
      });
    }
  );

  lab.experiment('with 3 parameters', function () {
    const migration = new Migration(fileName, dirName, date);

    lab.test('should have title set', () => {
      Code.expect(migration.title).to.equal(fileName);
    });

    lab.test('should have date set with month', () => {
      Code.expect(migration.date).to.equal(date);
    });

    lab.test('should have name set', () => {
      Code.expect(migration.name).to.equal(dateString + '-' + fileName);
    });

    lab.test('should have path set', () => {
      Code.expect(migration.path).to.equal(
        dirName + dateString + '-' + fileName
      );
    });

    lab.test('should have templateType not set', () => {
      Code.expect(migration.templateType).to.be.undefined();
    });
  });

  lab.experiment('with 5 parameters', function () {
    const migration = new Template(
      fileName,
      dirName,
      date,
      templateType,
      internals
    );

    lab.test('should have title set', () => {
      Code.expect(migration.file.title).to.equal(fileName);
    });

    lab.test('should have date set', () => {
      Code.expect(migration.file.date).to.equal(date);
    });

    lab.test('should have name set', () => {
      Code.expect(migration.file.name).to.equal(dateString + '-' + fileName);
    });

    lab.test('should have path set', () => {
      Code.expect(migration.file.path).to.equal(
        dirName + dateString + '-' + fileName
      );
    });

    lab.test('should have templateType set', () => {
      Code.expect(migration.templateType).to.equal(templateType);
    });
  });
}

function getTemplate () {
  lab.experiment(
    'when template type is not set',

    function () {
      const migration = new Template(fileName, dirName, date, internals);

      lab.test('should return default javascript template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultJsTemplate());
      });
    }
  );

  lab.experiment('when template type is set', function () {
    lab.experiment('as sql file loader', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.SQL_FILE_LOADER,
        internals
      );

      lab.test('should return sql file loader template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.sqlFileLoaderTemplate());
      });
    });

    lab.experiment('as default sql', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.DEFAULT_SQL,
        internals
      );

      lab.test('should return default sql template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultSqlTemplate());
      });
    });

    lab.experiment('as default coffee', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.DEFAULT_COFFEE,
        internals
      );

      lab.test('should return default coffee template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultCoffeeTemplate());
      });
    });

    lab.experiment('as coffee sql loader', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.COFFEE_SQL_FILE_LOADER,
        internals
      );

      lab.test('should return default coffee template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.coffeeSqlFileLoaderTemplate());
      });
    });

    lab.experiment('as default javascript', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.DEFAULT_JS,
        internals
      );

      lab.test('should return default sql template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultJsTemplate());
      });
    });
  });

  lab.experiment('when template plugin is set', function () {
    lab.experiment('as sql file loader', function () {
      const name = 'test';
      const plugins = Plugins.createSinglePlugin(
        `template:overwrite:provider:${name}`,
        opts => {
          return `test all variables`;
        }
      );
      const migration = new Template(fileName, dirName, date, name, plugins);

      lab.test('should return sql file loader template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(`test all variables`);
      });
    });

    lab.experiment('as default sql', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.DEFAULT_SQL,
        internals
      );

      lab.test('should return default sql template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultSqlTemplate());
      });
    });

    lab.experiment('as default coffee', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.DEFAULT_COFFEE,
        internals
      );

      lab.test('should return default coffee template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultCoffeeTemplate());
      });
    });

    lab.experiment('as coffee sql loader', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.COFFEE_SQL_FILE_LOADER,
        internals
      );

      lab.test('should return default coffee template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.coffeeSqlFileLoaderTemplate());
      });
    });

    lab.experiment('as default javascript', function () {
      const migration = new Template(
        fileName,
        dirName,
        date,
        Template.TemplateType.DEFAULT_JS,
        internals
      );

      lab.test('should return default sql template', () => {
        const actual = migration.getTemplate();
        Code.expect(actual).to.equal(migration.defaultJsTemplate());
      });
    });
  });
}

function stubApiInstance (isModule, stubs, options, callback) {
  delete require.cache[require.resolve('../api.js')];
  delete require.cache[require.resolve('yargs')];
  const Mod = proxyquire('../api.js', stubs);
  const plugins = {};
  options = options || {};

  options = Object.assign(options, {
    throwUncatched: true,
    cwd: __dirname
  });

  return new Mod(plugins, isModule, options, callback);
}

function createDateForTest () {
  const date = new Date();
  date.setUTCFullYear(2014);
  date.setUTCDate('20');
  date.setUTCMonth('01');
  date.setUTCHours('14');
  date.setUTCMinutes('30');
  date.setUTCSeconds('50');
  return date;
}
