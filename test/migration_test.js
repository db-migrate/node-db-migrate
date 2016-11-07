var vows = require('vows');
var assert = require('assert');
var migration = require('../lib/migration.js');

var date = createDateForTest();
var dateString = '20140220143050';
var dirName = '/directory/name/';
var fileNameNoExtension = 'filename';
var fileName = 'filename.js';
var templateType = Migration.TemplateType.SQL_FILE_LOADER;
var transactionless = true;

vows.describe('migration').addBatch({
  'when creating a new migration object': {
    'with 1 parameter as the complete filepath': {
      topic: function() {
        var migration = new Migration(dirName + dateString+'-'+fileName);
        return migration;
      },
      'should have title set without file extension': function(migration) {
        assert.equal(migration.title, fileNameNoExtension);
      },
      'should have date set': function(migration) {
        migration.date.setMilliseconds(0);
        date.setMilliseconds(0);
        assert.equal(migration.date.getTime(), date.getTime());
      },
      'should have name set without file extension': function(migration) {
        assert.equal(migration.name, dateString+'-'+fileNameNoExtension);
      },
      'should have path set': function(migration) {
        assert.equal(migration.path, dirName+dateString+'-'+fileName);
      },
      'should have templateType not set': function(migration) {
        assert.equal(migration.templateType, undefined);
      },
      'should be executed in transaction': function(migration) {
        assert.equal(migration.transactionless, true);
      }
    },
    'with 1 parameter as the complete filepath and transactionless': {
      topic: function() {
        var migration = new Migration(dirName + dateString+'-NO-TRANS-'+fileName);
        return migration;
      },
      'should have title set without file extension': function(migration) {
        assert.equal(migration.title, fileNameNoExtension);
      },
      'should have date set': function(migration) {
        migration.date.setMilliseconds(0);
        date.setMilliseconds(0);
        assert.equal(migration.date.getTime(), date.getTime());
      },
      'should have name set without file extension': function(migration) {
        assert.equal(migration.name, dateString+'-NO-TRANS-'+fileNameNoExtension);
      },
      'should have path set': function(migration) {
        assert.equal(migration.path, dirName+dateString+'-NO-TRANS-'+fileName);
      },
      'should have templateType not set': function(migration) {
        assert.equal(migration.templateType, undefined);
      },
      'should be transactionless': function(migration) {
        assert.equal(migration.transactionless, false);
      }
    },
    'with 3 parameters': {
      topic: function() {
        var migration = new Migration(fileName, dirName, date);
        return migration;
      },
      'should have title set': function(migration) {
        assert.equal(migration.title, fileName);
      },
      'should have date set with month': function(migration) {
        assert.equal(migration.date, date);
      },
      'should have name set': function(migration) {
        assert.equal(migration.name, dateString+'-'+fileName);
      },
      'should have path set': function(migration) {
        assert.equal(migration.path, dirName+dateString+'-'+fileName);
      },
      'should have templateType not set': function(migration) {
        assert.equal(migration.templateType, undefined);
      }
    },
    'with 4 parameters': {
      topic: function() {
        var migration = new Migration(fileName, dirName, date, templateType);
        return migration;
      },
      'should have title set': function(migration) {
        assert.equal(migration.title, fileName);
      },
      'should have date set': function(migration) {
        assert.equal(migration.date, date);
      },
      'should have name set': function(migration) {
        assert.equal(migration.name, dateString+'-'+fileName);
      },
      'should have path set': function(migration) {
        assert.equal(migration.path, dirName+dateString+'-'+fileName);
      },
      'should have templateType set': function(migration) {
        assert.equal(migration.templateType, templateType);
      },
      'should be transactionless': function(migration) {
        assert.equal(migration.transactionless, false);
      }
    },
    'with 5 parameters': {
      topic: function() {
        var migration = new Migration(fileName, dirName, date, templateType, transactionless);
        return migration;
      },
      'should have title set': function(migration) {
        assert.equal(migration.title, fileName);
      },
      'should have date set': function(migration) {
        assert.equal(migration.date, date);
      },
      'should have name set': function(migration) {
        assert.equal(migration.name, dateString+'-NO-TRANS-'+fileName);
      },
      'should have path set': function(migration) {
        assert.equal(migration.path, dirName+dateString+'-NO-TRANS-'+fileName);
      },
      'should have templateType set': function(migration) {
        assert.equal(migration.templateType, templateType);
      },
      'should be transactionless': function(migration) {
        assert.equal(migration.transactionless, true);
      }
    }
  }
}).addBatch({
  'get template' : {
    'when template type is not set': {
      topic: function() {
          var migration = new Migration(fileName, dirName, date);
          return migration;
        },
      'should return default javascript template': function(migration) {
        var actual = migration.getTemplate();
        assert.equal(actual, migration.defaultJsTemplate());
      }
    },
    'when template type is set': {
      'as sql file loader' : {
        topic: function() {
            var migration = new Migration(fileName, dirName, date, Migration.TemplateType.SQL_FILE_LOADER);
            return migration;
          },
        'should return sql file loader template': function(migration) {
          var actual = migration.getTemplate();
          assert.equal(actual, migration.sqlFileLoaderTemplate());
        }
      },
      'as default sql' : {
        topic: function() {
            var migration = new Migration(fileName, dirName, date, Migration.TemplateType.DEFAULT_SQL);
            return migration;
          },
        'should return default sql template': function(migration) {
          var actual = migration.getTemplate();
          assert.equal(actual, migration.defaultSqlTemplate());
        }
      },
      'as default coffee' : {
        topic: function() {
            var migration = new Migration(fileName, dirName, date, Migration.TemplateType.DEFAULT_COFFEE);
            return migration;
          },
        'should return default coffee template': function(migration) {
          var actual = migration.getTemplate();
          assert.equal(actual, migration.defaultCoffeeTemplate());
        }
      },
      'as default javascript' : {
        topic: function() {
            var migration = new Migration(fileName, dirName, date, Migration.TemplateType.DEFAULT_JS);
            return migration;
          },
        'should return default sql template': function(migration) {
          var actual = migration.getTemplate();
          assert.equal(actual, migration.defaultJsTemplate());
        }
      }
    }
  }
}).export(module);


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
