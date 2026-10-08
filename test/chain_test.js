'use strict';
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = (exports.lab = Lab.script());
const Chain = require('../lib/chain.js');

lab.experiment('chain', function () {
  // records which link executed which step
  const setup = () => {
    const calls = [];
    const link = (name, extra = {}) =>
      Object.assign(
        {
          getInterface: () => ({
            createTable: async t => calls.push(`${name}:createTable:${t}`),
            addColumn: async (t, c) => calls.push(`${name}:addColumn:${t}.${c}`)
          })
        },
        extra
      );

    const internals = {};
    const driver = { runSql: async () => {} };
    const chain = new Chain({}, { name: 'm1' }, driver, internals, {});
    chain.addChain(link('learn', { learns: true }));
    chain.addChain(link('migrate'));

    return { chain, calls, internals };
  };

  lab.test('should number the steps of a migration', async () => {
    const { chain, calls, internals } = setup();

    await chain.createTable('a');
    Code.expect(internals.migrationOp).to.equal(1);
    await chain.addColumn('a', 'x');
    Code.expect(internals.migrationOp).to.equal(2);

    Code.expect(calls).to.equal([
      'learn:createTable:a',
      'migrate:createTable:a',
      'learn:addColumn:a.x',
      'migrate:addColumn:a.x'
    ]);
  });

  lab.test('should skip the steps already executed', async () => {
    const { chain, calls } = setup();
    chain.recovery = { step: 2, learned: 2, done: 2 };

    await chain.createTable('a');
    await chain.addColumn('a', 'x');
    await chain.createTable('b');

    Code.expect(calls).to.equal([
      'learn:createTable:b',
      'migrate:createTable:b'
    ]);
  });

  lab.test('should not learn an interrupted step again', async () => {
    const { chain, calls } = setup();
    chain.recovery = { step: 2, learned: 2, done: 1 };

    await chain.createTable('a');
    await chain.addColumn('a', 'x');
    await chain.createTable('b');

    Code.expect(calls).to.equal([
      'migrate:addColumn:a.x',
      'learn:createTable:b',
      'migrate:createTable:b'
    ]);
  });

  lab.test('should learn an interrupted step not learned yet', async () => {
    const { chain, calls } = setup();
    chain.recovery = { step: 2, learned: 1, done: 1 };

    await chain.createTable('a');
    await chain.addColumn('a', 'x');

    Code.expect(calls).to.equal([
      'learn:addColumn:a.x',
      'migrate:addColumn:a.x'
    ]);
  });
});
