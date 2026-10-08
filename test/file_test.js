'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const path = require('path');
const File = require('../lib/file.js');

lab.experiment('file', function () {
  // a plugin loading its own files, like db-migrate-plugin-sql
  const plugins = load => ({
    hook: name =>
      name === 'file:hook:require'
        ? [{ 'file:hook:require': () => ({ extensions: 'sql', load }) }]
        : false
  });

  lab.test('should load files of a plugin with its loader', async () => {
    const internals = {};
    const loaded = { up: () => {} };

    const parser = await File.registerHook(plugins(() => loaded), internals);

    Code.expect(parser.filesRegEx.test('20261009120000-a.sql')).to.be.true();
    Code.expect(parser.filesRegEx.test('20261009120000-a.js')).to.be.true();
    Code.expect(
      new File('/m/20261009120000-a.sql', internals).get()
    ).to.shallow.equal(loaded);
  });

  lab.test('should find files of a plugin recorded without extension', async () => {
    const internals = {};
    const dir = require('fs').mkdtempSync(
      path.join(require('os').tmpdir(), 'dbm-file-')
    );
    require('fs').writeFileSync(path.join(dir, '20261009120000-a.sql'), '');
    let loadedPath;

    await File.registerHook(
      plugins(file => {
        loadedPath = file;
        return {};
      }),
      internals
    );
    new File(path.join(dir, '20261009120000-a'), internals).get();

    Code.expect(loadedPath).to.equal(path.join(dir, '20261009120000-a.sql'));
  });

  lab.test('should still require other files', async () => {
    const internals = {};
    const dir = require('fs').mkdtempSync(
      path.join(require('os').tmpdir(), 'dbm-file-')
    );
    const file = path.join(dir, '20261009120000-a.js');
    require('fs').writeFileSync(file, 'exports.up = function () {};');
    await File.registerHook(plugins(() => ({})), internals);

    Code.expect(new File(file, internals).get()).to.shallow.equal(require(file));
  });

  lab.test('should keep the extension only parsers working', async () => {
    const internals = {};
    const parser = await File.registerHook(
      {
        hook: name =>
          name === 'file:hook:require'
            ? [{ 'file:hook:require': () => ({ extensions: 'coffee' }) }]
            : false
      },
      internals
    );

    Code.expect(parser.filesRegEx.test('20261009120000-a.coffee')).to.be.true();
  });
});
