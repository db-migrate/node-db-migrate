var proxyquire = require('proxyquire').noPreserveCache();
var Promise = require('bluebird');
var Code = require('@hapi/code');
var Lab = require('@hapi/lab');
var lab = (exports.lab = Lab.script());

lab.experiment('driver sql errors', function () {
  const connect = db =>
    new Promise((resolve, reject) => {
      var index = proxyquire('../../lib/driver/index', {
        './fake': {
          connect: (config, intern, cb) => cb(null, db),
          '@noCallThru': true
        }
      });

      index.connect({ driver: 'fake' }, {}, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });

  lab.test('should attach the failed statement to promise errors', async () => {
    const db = await connect({
      runSql: () => Promise.reject(new Error('boom'))
    });

    const err = await Code.expect(db.runSql('SELEC 1')).to.reject('boom');
    Code.expect(err.sql).to.equal('SELEC 1');
    Code.expect(err.sqlParams).to.be.false();
  });

  lab.test('should attach the failed statement to callback errors', async () => {
    const db = await connect({
      all: (sql, params, cb) => cb(new Error('boom'))
    });

    const err = await new Promise(resolve =>
      db.all('SELECT ?', [1], e => resolve(e))
    );
    Code.expect(err.sql).to.equal('SELECT ?');
    Code.expect(err.sqlParams).to.be.true();
  });

  lab.test('should keep the statement a driver attached itself', async () => {
    const own = new Error('boom');
    own.sql = 'SELEC 1 /* as sent */';
    const db = await connect({ runSql: () => Promise.reject(own) });

    const err = await Code.expect(db.runSql('SELEC 1')).to.reject('boom');
    Code.expect(err.sql).to.equal('SELEC 1 /* as sent */');
  });

  lab.test('should pass results through', async () => {
    const db = await connect({ runSql: sql => Promise.resolve([sql]) });

    Code.expect(await db.runSql('SELECT 1')).to.equal(['SELECT 1']);
  });
});
