'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const Learn = require('../lib/learn.js');

lab.experiment('learn', function () {
  const setup = () => {
    const internals = {
      schema: {
        i: { t: { i1: { t: 't', c: ['x'] }, i2: { t: 't', c: ['y'] } } },
        c: {
          t: { id: { type: 'int' }, x: { type: 'string' }, y: { type: 'string' } },
          p: { id: { type: 'int' } }
        },
        f: {
          t: {
            f1: { t: 't', rt: 'p', m: { x: 'id' } },
            f2: { t: 't', rt: 'p', m: { y: 'id' } }
          }
        },
        e: {}
      },
      modSchema: { i: {}, c: {}, f: {}, s: [] }
    };
    const noop = async () => {};
    const driver = {
      removeColumn: noop,
      removeIndex: noop,
      removeForeignKey: noop
    };

    return { learn: Learn.getInterface(driver, {}, driver, internals), internals };
  };

  const fresh = (meta, unlearn = false) => {
    const internals = {
      schema: { i: {}, c: {}, f: {}, e: {} },
      modSchema: { i: {}, c: {}, f: {}, s: [] },
      unlearn
    };
    const noop = async () => {};
    const driver = { _meta: meta };
    [
      'createTable',
      'dropTable',
      'renameTable',
      'addColumn',
      'removeColumn',
      'renameColumn',
      'changeColumn',
      'addIndex',
      'removeIndex',
      'addForeignKey',
      'removeForeignKey'
    ].forEach(m => {
      driver[m] = noop;
    });

    return { learn: Learn.getInterface(driver, {}, driver, internals), internals };
  };

  lab.test('should learn tables and record their reverse operations', async () => {
    const { learn, internals } = fresh();

    await learn.createTable('p', { id: { type: 'int' } });
    await learn.createTable('t', {
      id: { type: 'int' },
      pid: {
        type: 'int',
        foreignKey: { name: 't_p_fk', table: 'p', mapping: 'id', rules: { onDelete: 'CASCADE' } }
      }
    });
    await learn.renameTable('t', 't2');
    await learn.dropTable('t2');

    Code.expect(Object.keys(internals.schema.c)).to.equal(['p']);
    Code.expect(internals.modSchema.c.t2.pid.type).to.equal('int');
    Code.expect(internals.modSchema.s.map(x => x.a)).to.equal([
      'dropTable',
      'dropTable',
      'renameTable',
      'createTable'
    ]);
  });

  lab.test('should learn columns and record their reverse operations', async () => {
    const { learn, internals } = fresh();

    await learn.createTable('t', { id: { type: 'int' } });
    await learn.addColumn('t', 'x', { type: 'string' });
    await learn.changeColumn('t', 'x', { length: 10 });
    await learn.renameColumn('t', 'x', 'y');
    await learn.addIndex('t', 'i1', ['y'], true);
    await learn.addIndex('t', 'i2', [{ name: 'y' }]);
    await learn.addIndex('t', 'i3', 'y');

    Code.expect(internals.schema.c.t.y).to.equal({ type: 'string', length: 10 });
    Code.expect(internals.schema.i.t.i1).to.equal({ t: 't', c: ['y'], u: true });
    Code.expect(internals.modSchema.s.map(x => x.a)).to.equal([
      'dropTable',
      'removeColumn',
      'changeColumn',
      'renameColumn',
      'removeIndex',
      'removeIndex',
      'removeIndex'
    ]);
  });

  lab.test('should point to adopt for unknown tables, columns and keys', async () => {
    const { learn } = fresh();

    await learn.createTable('t', { id: { type: 'int' } });

    Code.expect(() => learn.addColumn('missing', 'x', {})).to.throw(
      /The table "missing" is unknown .* db\.adopt\.createTable\("missing", columns\)\.$/
    );
    Code.expect(() => learn.changeColumn('t', 'missing', {})).to.throw(
      /db\.adopt\.addColumn\("t", "missing", spec\)\.$/
    );
    Code.expect(() => learn.removeIndex('t', 'i')).to.throw(
      /db\.adopt\.addIndex\("t", "i", columns\)\.$/
    );
    Code.expect(() => learn.addForeignKey('t', 'missing', 'k', {})).to.throw(
      /The table "missing" is unknown/
    );
    Code.expect(() => learn.removeForeignKey('t', 'k')).to.throw(
      /db\.adopt\.addForeignKey\("t", referencedTable, "k", mapping\), or pass \{ irreversible: true \}/
    );
  });

  lab.test('should refuse to drop unknown tables unless irreversible', async () => {
    const { learn, internals } = fresh();

    Code.expect(() => learn.dropTable('legacy')).to.throw(
      /db\.adopt\.createTable\("legacy", columns\), or pass \{ irreversible: true \}/
    );
    Code.expect(() => learn.removeColumn('legacy', 'x')).to.throw(
      /The table "legacy" is unknown .* irreversible/
    );

    await learn.dropTable('legacy', { irreversible: true });
    await learn.removeColumn('legacy', 'x', { irreversible: true });
    await learn.removeForeignKey('legacy', 'k', { irreversible: true });

    Code.expect(internals.modSchema.s).to.equal([
      { t: 3, a: 'dropTable', c: ['legacy'] },
      { t: 3, a: 'removeColumn', c: ['legacy', 'x'] },
      { t: 3, a: 'removeForeignKey', c: ['legacy', 'k'] }
    ]);
  });

  lab.test('should drop known tables as before, irreversible or not', async () => {
    const { learn, internals } = fresh();

    await learn.createTable('t', { id: { type: 'int' } });
    await learn.dropTable('t', { irreversible: true });

    Code.expect(internals.modSchema.s[1]).to.equal({ t: 1, a: 'createTable', c: ['t'] });
  });

  lab.test('should require a strategy to remove a notNull column', async () => {
    const supported = { supports: { optionParam: true, columnStrategies: true } };
    const columns = { id: { type: 'int' }, x: { type: 'string', notNull: true } };

    let { learn } = fresh();
    await learn.createTable('t', Object.assign({}, columns));
    Code.expect(() => learn.removeColumn('t', 'x')).to.throw(/optionParameters/);

    ({ learn } = fresh(supported));
    await learn.createTable('t', Object.assign({}, columns));
    Code.expect(() => learn.removeColumn('t', 'x')).to.throw(/recreation strategy/);
    Code.expect(() =>
      learn.removeColumn('t', 'x', { columnStrategy: 'unknown' })
    ).to.throw(/no such column recreation strategy/);

    let internals;
    ({ learn, internals } = fresh(supported));
    await learn.createTable('t', Object.assign({}, columns));
    await learn.removeColumn('t', 'x', {
      columnStrategy: 'defaultValue',
      passthrough: { defaultValue: 'a' }
    });
    Code.expect(internals.modSchema.c.t.x.defaultValue).to.equal('a');
    Code.expect(internals.modSchema.s[1].a).to.equal('addColumn');

    ({ learn, internals } = fresh(supported));
    await learn.createTable('t', Object.assign({}, columns));
    await learn.removeColumn('t', 'x', { columnStrategy: 'delay' });
    Code.expect(internals.modSchema.s[1].a).to.equal('renameColumn');
  });

  lab.test('should not record anything unlearning', async () => {
    const { learn, internals } = fresh(undefined, true);

    await learn.createTable('t', { id: { type: 'int' }, x: { type: 'string' } });
    await learn.removeColumn('t', 'x');

    Code.expect(internals.modSchema.s).to.equal([]);
    Code.expect(internals.schema.c.t.x).to.not.exist();
  });

  lab.test('should keep every column removed from the same table', async () => {
    const { learn, internals } = setup();

    await learn.removeColumn('t', 'x');
    await learn.removeColumn('t', 'y');

    Code.expect(Object.keys(internals.modSchema.c.t)).to.equal(['x', 'y']);
  });

  lab.test('should keep every index removed from the same table', async () => {
    const { learn, internals } = setup();

    await learn.removeIndex('t', 'i1');
    await learn.removeIndex('t', 'i2');

    Code.expect(Object.keys(internals.modSchema.i.t)).to.equal(['i1', 'i2']);
  });

  lab.test('should record how to restore a removed foreign key', async () => {
    const { learn, internals } = setup();

    await learn.removeForeignKey('t', 'f1');
    await learn.removeForeignKey('t', 'f2');

    Code.expect(Object.keys(internals.modSchema.f.t)).to.equal(['f1', 'f2']);
    Code.expect(internals.modSchema.s).to.equal([
      { t: 1, a: 'addForeignKey', c: ['t', 'f1'] },
      { t: 1, a: 'addForeignKey', c: ['t', 'f2'] }
    ]);
  });
});
