'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const setDefaultArgv = require('../lib/commands/set-default-argv.js');

lab.experiment('argv', function () {
  const internals = cmdOptions => ({
    cwd: process.cwd(),
    cmdOptions,
    plugins: { hook: () => false }
  });

  lab.test('should have positional arguments in module mode', () => {
    const intern = internals({});
    setDefaultArgv(intern, true);

    Code.expect(intern.argv._).to.equal([]);
  });

  lab.test('should keep positional arguments passed as options', () => {
    const intern = internals({ _: ['name'] });
    setDefaultArgv(intern, true);

    Code.expect(intern.argv._).to.equal(['name']);
  });

  lab.test('should map the long names of options from rc files', () => {
    const intern = internals({});
    setDefaultArgv(intern, true);

    Code.expect(intern.migrationState).to.equal('migrations_state');
    Code.expect(intern.migrationTable).to.equal('migrations');
  });
});
