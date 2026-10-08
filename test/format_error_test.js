'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const formatError = require('../lib/format-error.js');

lab.experiment('formatError', function () {
  const pgError = () => {
    const err = new Error('syntax error at or near ")"');
    Object.assign(err, {
      migration: '20261009000001-case',
      sql: 'CREATE TABLE bad (id int,)',
      position: '26',
      code: '42601',
      detail: undefined,
      file: 'scan.l',
      routine: 'scanner_yyerror'
    });
    return err;
  };

  lab.test('should name the migration, show the SQL and mark the position', () => {
    const lines = formatError(pgError()).split('\n');

    Code.expect(lines[0]).to.equal(
      'Migration "20261009000001-case" failed: syntax error at or near ")"'
    );
    Code.expect(lines[1]).to.equal('    SQL: CREATE TABLE bad (id int,)');
    Code.expect(lines[2].indexOf('^')).to.equal(lines[1].indexOf(')'));
    Code.expect(lines[3]).to.equal('    code: 42601');
  });

  lab.test('should always keep the stack', () => {
    const err = pgError();

    Code.expect(formatError(err)).to.include(err.stack.split('\n')[1].trim());
  });

  lab.test('should leave out unset and internal fields unless verbose', () => {
    const out = formatError(pgError());

    Code.expect(out).to.not.include('detail');
    Code.expect(out).to.not.include('scan.l');
    Code.expect(formatError(pgError(), { verbose: true })).to.include('scan.l');
  });

  lab.test('should mark the position in multi line SQL with leading blank lines', () => {
    const err = new Error('syntax error at or near "SELEC"');
    err.sql = '\n  CREATE TABLE a (id int);\n  SELEC 1;';
    err.position = String(err.sql.indexOf('SELEC') + 1);

    const lines = formatError(err).split('\n');

    Code.expect(lines[1]).to.equal('    SQL:   CREATE TABLE a (id int);');
    Code.expect(lines[2]).to.equal('           SELEC 1;');
    Code.expect(lines[3].indexOf('^')).to.equal(lines[2].indexOf('S'));
  });

  lab.test('should not mark the position of SQL with parameters', () => {
    const err = new Error('invalid input');
    err.sql = 'INSERT INTO a VALUES (?, ?)';
    err.position = '24';
    Object.defineProperty(err, 'sqlParams', { value: true });

    const out = formatError(err);

    Code.expect(out).to.not.include('^');
    Code.expect(out).to.include('position: 24');
  });

  lab.test('should name the failed instruction and skip a duplicated sqlMessage', () => {
    const err = new Error('You have an error in your SQL syntax');
    Object.assign(err, {
      migration: 'm1',
      instruction: 'at step 2 addColumn("t", "x")',
      sqlMessage: 'You have an error in your SQL syntax',
      errno: 1064
    });

    const out = formatError(err);

    Code.expect(out.split('\n')[0]).to.equal(
      'Migration "m1" failed at step 2 addColumn("t", "x"): You have an error in your SQL syntax'
    );
    Code.expect(out).to.include('errno: 1064');
    Code.expect(out).to.not.include('sqlMessage');
  });

  lab.test('should cope with anything thrown', () => {
    Code.expect(formatError('just a string')).to.equal('just a string');
    Code.expect(formatError(undefined)).to.equal('undefined');
    Code.expect(formatError({ message: 'plain object', position: 3 })).to.include(
      'position: 3'
    );
  });
});
