'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const { execFileSync } = require('child_process');
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

  lab.test('options passed to the API win over rc files', () => {
    process.env['db-migrate_table'] = 'rc';

    try {
      const passed = internals({ table: 'api' });
      setDefaultArgv(passed, true);
      Code.expect(passed.migrationTable).to.equal('api');

      const intern = internals({});
      setDefaultArgv(intern, true);
      Code.expect(intern.migrationTable).to.equal('rc');
    } finally {
      delete process.env['db-migrate_table'];
    }
  });

  lab.test('the command line wins over rc files, with short options too', () => {
    // yargs reads the arguments of the process once, when it is loaded
    const table = args =>
      execFileSync(
        process.execPath,
        [
          '-e',
          `process.argv = ['node', 'db-migrate'].concat(${JSON.stringify(args)});
          const setDefaultArgv = require(${JSON.stringify(require.resolve('../lib/commands/set-default-argv.js'))});
          const intern = { cwd: process.cwd(), plugins: { hook: () => false } };
          setDefaultArgv(intern, false);
          process.stdout.write(intern.migrationTable);`
        ],
        { env: Object.assign({}, process.env, { 'db-migrate_table': 'rc' }) }
      ).toString();

    Code.expect(table(['up', '-t', 'cli'])).to.equal('cli');
    Code.expect(table(['up', '--migration-table', 'cli'])).to.equal('cli');
    Code.expect(table(['up'])).to.equal('rc');
  });
});
