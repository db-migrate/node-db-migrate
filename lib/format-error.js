'use strict';

const util = require('util');

/**
 * Diagnostic fields drivers set on their errors (pg, cockroachdb, mysql2,
 * sqlite3), printed when present. Everything else, like the server source
 * location of pg errors, is only printed verbose.
 */
const FIELDS = [
  'code',
  'errno',
  'sqlState',
  'sqlMessage',
  'detail',
  'hint',
  'where',
  'schema',
  'table',
  'column',
  'dataType',
  'constraint'
];

const indent = (text, prefix) =>
  String(text)
    .split('\n')
    .map(line => prefix + line)
    .join('\n');

/**
 * The SQL with a marker below the position reported by the database.
 * Without parameters only, drivers rewrite their placeholders before
 * sending, so the position would be off otherwise.
 */
const formatSql = err => {
  // the position refers to the statement as sent, so nothing is trimmed
  // before locating it, leading blank lines are only dropped for display
  const sql = String(err.sql).replace(/\s+$/, '');
  const lines = sql.split('\n');
  let first = 0;
  while (first < lines.length - 1 && lines[first].trim() === '') first++;

  const position = Number(err.position);
  let marker = null;

  if (Number.isInteger(position) && position >= 1 && position <= sql.length + 1) {
    if (err.sqlParams) {
      marker = { text: `position: ${position}` };
    } else {
      const before = sql.slice(0, position - 1);
      const row = before.split('\n').length - 1;
      const column = before.length - (before.lastIndexOf('\n') + 1);
      // keep tabs, so the marker lines up with the statement
      marker = {
        row,
        text: '     ' + lines[row].slice(0, column).replace(/[^\t]/g, ' ') + '^'
      };
    }
  }

  const out = [];
  lines.slice(first).forEach((line, i) => {
    out.push((i === 0 ? 'SQL: ' : '     ') + line);
    if (marker && marker.row === first + i) out.push(marker.text);
  });

  if (marker && marker.row === undefined) out.push(marker.text);

  return out;
};

/**
 * Format an error of a failed migration for the log: what failed, the SQL
 * and the diagnostic fields of the driver, and always the stack.
 */
module.exports = function formatError (err, { verbose = false } = {}) {
  if (!err || typeof err !== 'object') {
    return String(err);
  }

  const message = err.message || String(err);
  const lines = [
    err.migration
      ? `Migration "${err.migration}" failed` +
        (err.instruction ? ` ${err.instruction}` : '') +
        `: ${message}`
      : message
  ];

  if (err.sql) {
    lines.push(indent(formatSql(err).join('\n'), '    '));
  }

  FIELDS.forEach(field => {
    const value = err[field];

    if (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !(field === 'sqlMessage' && value === message)
    ) {
      lines.push(`    ${field}: ${value}`);
    }
  });

  if (err.position !== undefined && !err.sql) {
    lines.push(`    position: ${err.position}`);
  }

  lines.push(indent(err.stack || `${err.name}: ${message}`, '    '));

  if (verbose) {
    lines.push(indent(util.inspect(err, { depth: 4 }), '    '));
  }

  return lines.join('\n');
};
