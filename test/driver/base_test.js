var Code = require('@hapi/code');
var Lab = require('@hapi/lab');
var lab = (exports.lab = Lab.script());
var Base = require('db-migrate-base');

var internals = {
  migrationTable: 'migrations',
  mod: {
    log: require('db-migrate-shared').log,
    type: require('db-migrate-shared').dataType
  }
};

lab.experiment('base', function () {
  lab.experiment('default implementation', function () {
    var base = new Base(internals);

    lab.test('inherits from EventEmitter', () => {
      Code.expect(base.on).to.be.not.null();
      Code.expect(base.emit).to.be.not.null();
    });

    lab.test('throws errors for all API methods', () => {
      Code.expect(function () {
        base.createTable();
      }).to.throw(Error);

      Code.expect(function () {
        base.dropTable();
      }).to.throw(Error);

      Code.expect(function () {
        base.addColumn();
      }).to.throw(Error);

      Code.expect(function () {
        base.removeColumn();
      }).to.throw(Error);

      Code.expect(function () {
        base.renameColumn();
      }).to.throw(Error);

      Code.expect(function () {
        base.changeColumn();
      }).to.throw(Error);

      Code.expect(function () {
        base.addIndex();
      }).to.throw(Error);

      Code.expect(function () {
        base.insert();
      }).to.throw(Error);

      Code.expect(function () {
        base.removeIndex();
      }).to.throw(Error);

      Code.expect(function () {
        base.addAssociation();
      }).to.throw(Error);

      Code.expect(function () {
        base.removeAssociation();
      }).to.throw(Error);

      Code.expect(function () {
        base.addForeignKey();
      }).to.throw(Error);

      Code.expect(function () {
        base.removeForeignKey();
      }).to.throw(Error);

      Code.expect(function () {
        base.runSql();
      }).to.throw(Error);
    });

    lab.test('escapes single quotes', () => {
      Code.expect("Bill''s Mother''s House").to.equal(
        base.escape("Bill's Mother's House")
      );
    });
  });
});
