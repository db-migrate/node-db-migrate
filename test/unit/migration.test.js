'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const sinon = require('sinon');
const testHelper = require('./testHelper.js');
const path = require('path');
const Migration = require('../../lib/file.js');
const Template = require('../../lib/template.js');

//#region Variables
const date = createDateForTest();
const dateString = '20140220143050';
const dirName = path.resolve('/directory/name/');
const fileNameNoExtension = 'filename';
const fileName = `${fileNameNoExtension}.js`;
const templateType = Template.TemplateType.SQL_FILE_LOADER;
//#endregion

//#region Functions

function createDateForTest () {
  const date = new Date();
  date.setUTCFullYear(2014);
  date.setUTCDate(20);
  date.setUTCMonth(1);
  date.setUTCHours(14);
  date.setUTCMinutes(30);
  date.setUTCSeconds(50);

  return date;
}
//#endregion

lab.experiment('migration', () => {
  let internals;

  lab.beforeEach(() => {
    internals = { migrationTable: 'migrations' };
  });

  lab.experiment('when creating a new migration object', () => {
    lab.experiment('with 2 parameters', () => {
      const migrationFile = path.join(dirName, `${dateString}-${fileName}`);
      const migration = new Migration(migrationFile, internals);

      lab.test('should have title set without file extension', () => {
        Code.expect(migration.title).to.equal(fileNameNoExtension);
      });

      lab.test('should have date set', () => {
        migration.date.setMilliseconds(0);
        date.setMilliseconds(0);
        Code.expect(migration.date.getTime()).to.equal(date.getTime());
      });

      lab.test('should have name set', () => {
        Code.expect(migration.name).to.equal(
          `${dateString}-${fileNameNoExtension}`
        );
      });

      lab.test('should have path set', () => {
        const parsedPath = path.parse(migration.path);
        Code.expect(migration.path).to.equal(migrationFile);
        Code.expect(parsedPath.dir).to.equal(dirName);
        Code.expect(parsedPath.base).to.equal(
          `${dateString}-${fileName}`
        );
      });

      lab.test('should have templateType not set', () => {
        Code.expect(migration.templateType).to.not.exist();
      });

      lab.test('should not able to load any non-module file', () => {
        const fn = migration.get.bind(migration);
        Code.expect(fn).to.throw(Error, /Cannot find module.*/);
      });
    });

    lab.experiment('with 3 parameters', () => {
      const migrationFile = path.join(dirName, `${dateString}-${fileName}`);
      const migration = new Migration(fileName, dirName, date);

      lab.test('should have title set', () => {
        Code.expect(migration.title).to.equal(fileName);
      });

      lab.test('should have date set', () => {
        Code.expect(migration.date).to.equal(date);
      });

      lab.test('should have name set', () => {
        Code.expect(migration.name).to.equal(`${dateString}-${fileName}`);
      });

      lab.test('should have path set', () => {
        const parsedPath = path.parse(migration.path);
        Code.expect(migration.path).to.equal(path.join(migrationFile));
        Code.expect(parsedPath.dir).to.equal(dirName);
        Code.expect(parsedPath.base).to.equal(`${dateString}-${fileName}`);
      });

      lab.test('should have templateType not set', () => {
        Code.expect(migration.templateType).to.not.exist();
      });

      lab.test('should not able to load any non-module file', () => {
        const fn = migration.get.bind(migration);
        Code.expect(fn).to.throw(Error, /Cannot find module.*/);
      });
    });

    lab.experiment('with 5 parameters', () => {
      const migrationFile = path.join(dirName, `${dateString}-${fileName}`);
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
        Code.expect(migration.file.name).to.equal(`${dateString}-${fileName}`);
      });

      lab.test('should have path set', () => {
        const parsedPath = path.parse(migration.file.path);
        Code.expect(migration.file.path).to.equal(path.join(migrationFile));
        Code.expect(parsedPath.dir).to.equal(dirName);
        Code.expect(parsedPath.base).to.equal(`${dateString}-${fileName}`);
      });

      lab.test('should have templateType set', () => {
        Code.expect(migration.templateType).to.equal(templateType);
      });

      lab.test('should not able to load any non-module file', () => {
        const fn = migration.file.get.bind(migration.file);
        Code.expect(fn).to.throw(Error, /Cannot find module.*/);
      });
    });
  });

  lab.experiment('register hook', () => {
    lab.test('no plugin should return null', async () => {
      const actual = await Migration.registerHook({ hook: () => {} }, internals);
      Code.expect(actual).not.to.exist();
    });

    lab.test('migrator:migration:hook:require plugin should be outdated', async () => {
      const plugins = testHelper.createSinglePlugin(
        `migrator:migration:hook:require`,
        () => {
          return {
            extensions: 'coffee'
          };
        }
      );
      const expected = 'js|coffee';
      const actual = await Migration.registerHook(plugins, internals);

      Code.expect(actual).to.exist();
      Code.expect(actual.extensions).to.equal(expected);
      Code.expect(actual.filesRegEx).to.equal(
        new RegExp(`\\.(${expected})$`)
      );
    });

    lab.test('file:hook:require plugin should not be outdated', async () => {
      const plugins = testHelper.createSinglePlugin(`file:hook:require`, () => {
        return {
          extensions: 'coffee'
        };
      });
      const expected = 'js|coffee';
      const actual = await Migration.registerHook(plugins, internals);

      Code.expect(actual).to.exist();
      Code.expect(actual.extensions).to.equal(expected);
      Code.expect(actual.filesRegEx).to.equal(new RegExp(`\\.(${expected})$`));
    });
  });

  lab.experiment('load from file system', () => {
    lab.test('non existing directory should throw error', async () => {
      const fn = Migration.loadFromFileystem.bind(
        Migration,
        dirName,
        'prefix',
        internals
      );
      await Code.expect(fn()).to.reject();
    });
  });

  lab.experiment('get template', () => {
    lab.experiment('when template type is not set', () => {
      const migration = new Template(fileName, dirName, date, null, internals);

      lab.test('should have templateType not set', () => {
        Code.expect(migration.templateType).to.not.exist();
      });

      lab.test('should return default javascript template', () => {
        const expected = migration.defaultJsTemplate();
        const spy = sinon.spy(migration, 'defaultJsTemplate');
        const actual = migration.getTemplate();

        Code.expect(actual).to.exist();
        Code.expect(actual).to.equal(expected);
        Code.expect(spy.calledOnce).to.be.true();
      });
    });

    lab.experiment('when template type is set', () => {
      lab.experiment('as sql file loader', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.SQL_FILE_LOADER,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.SQL_FILE_LOADER
          );
        });

        lab.test('should return sql file loader template', () => {
          const expected = migration.sqlFileLoaderTemplate();
          const spy = sinon.spy(migration, 'sqlFileLoaderTemplate');
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
          Code.expect(spy.calledOnce).to.be.true();
        });
      });

      lab.experiment('as default sql', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.DEFAULT_SQL,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.DEFAULT_SQL
          );
        });

        lab.test('should return default sql template', () => {
          const expected = migration.defaultSqlTemplate();
          const spy = sinon.spy(migration, 'defaultSqlTemplate');
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
          Code.expect(spy.calledOnce).to.be.true();
        });
      });

      lab.experiment('as default coffee', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.DEFAULT_COFFEE,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.DEFAULT_COFFEE
          );
        });

        lab.test('should return default coffee template', () => {
          const expected = migration.defaultCoffeeTemplate();
          const spy = sinon.spy(migration, 'defaultCoffeeTemplate');
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
          Code.expect(spy.calledOnce).to.be.true();
        });
      });

      lab.experiment('as coffee sql loader', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.COFFEE_SQL_FILE_LOADER,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.COFFEE_SQL_FILE_LOADER
          );
        });

        lab.test('should return default coffee template', () => {
          const expected = migration.coffeeSqlFileLoaderTemplate();
          const spy = sinon.spy(migration, 'coffeeSqlFileLoaderTemplate');
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
          Code.expect(spy.calledOnce).to.be.true();
        });
      });

      lab.experiment('as sql default ignore on init template', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.SQL_FILE_LOADER_IGNORE_ON_INIT,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.SQL_FILE_LOADER_IGNORE_ON_INIT
          );
        });

        lab.test('should return sql ignore on init template', () => {
          const expected = migration.sqlFileLoaderIgnoreOnInitTemplate();
          const spy = sinon.spy(migration, 'sqlFileLoaderIgnoreOnInitTemplate');
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
          Code.expect(spy.calledOnce).to.be.true();
        });
      });

      lab.experiment('as default javascript', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.DEFAULT_JS,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.DEFAULT_JS
          );
        });

        lab.test('should return default sql template', () => {
          const expected = migration.defaultJsTemplate();
          const spy = sinon.spy(migration, 'defaultJsTemplate');
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
          Code.expect(spy.calledOnce).to.be.true();
        });
      });

      lab.experiment('as v2 default', () => {
        const migration = new Template(
          fileName,
          dirName,
          date,
          Template.TemplateType.V2_DEFAULT,
          internals
        );

        lab.test('should have templateType set', () => {
          Code.expect(migration.templateType).to.equal(
            Template.TemplateType.V2_DEFAULT
          );
        });

        lab.test('should return default v2 sql template', () => {
          const expected = require('../../lib/templates/v2.js')();
          const actual = migration.getTemplate();

          Code.expect(actual).to.exist();
          Code.expect(actual).to.equal(expected);
        });
      });
    });

    lab.experiment('when template plugin is set', () => {
      lab.experiment('as sql file loader', () => {
        const name = 'test';

        lab.test('should return plugin specified template', () => {
          const plugins = testHelper.createSinglePlugin(
            `template:overwrite:provider:${name}`,
            () => {
              return `test all variables`;
            }
          );
          const migration = new Template(fileName, dirName, date, name, plugins);
          const expected = `test all variables`;
          const actual = migration.getTemplate();

          Code.expect(actual).to.equal(expected);
        });

        lab.test('should throw if plugin fails', () => {
          const plugins = testHelper.createSinglePlugin(
            `template:overwrite:provider:${name}`,
            () => {
              throw new Error('test');
            }
          );
          const migration = new Template(fileName, dirName, date, name, plugins);
          const fn = migration.getTemplate.bind(migration);

          Code.expect(fn).to.throw(Error, 'test');
        });
      });
    });
  });

  lab.experiment('when using db-migrate as module', () => {
    lab.test('should create migration', async () => {
      const dbmigrate = testHelper.stubApiInstance(true, {}, {});
      dbmigrate.setConfigParam('_', []);

      await dbmigrate.create('migrationName');
    });
  });

  lab.after(async () => {
    await testHelper.wipeMigrations();
  });
});
