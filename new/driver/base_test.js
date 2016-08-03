var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Base = require('db-migrate-base');

var internals = {
  migrationTable: 'migrations',
  mod: {
    log: require('db-migrate-shared').log,
    type: require('db-migrate-shared').dataType
  }
};

lab.experiment('base', { parallel: true }, function() {

  lab.experiment('default implementation', { parallel: true }, function() {

    var base = new Base(internals);

    lab.test('inherits from EventEmitter', { parallel: true }, function(done) {

      Code.expect(base.on).to.be.not.null();
      Code.expect(base.emit).to.be.not.null();
      done();
    });

    lab.test('throws errors for all API methods', { parallel: true },
      function(done) {

      Code.expect(function() {
        base.createTable();
      }).to.throw(Error);

      Code.expect(function() {
        base.dropTable();
      }).to.throw(Error);

      Code.expect(function() {
        base.addColumn();
      }).to.throw(Error);

      Code.expect(function() {
        base.removeColumn();
      }).to.throw(Error);

      Code.expect(function() {
        base.renameColumn();
      }).to.throw(Error);

      Code.expect(function() {
        base.changeColumn();
      }).to.throw(Error);

      Code.expect(function() {
        base.addIndex();
      }).to.throw(Error);

      Code.expect(function() {
        base.insert();
      }).to.throw(Error);

      Code.expect(function() {
        base.removeIndex();
      }).to.throw(Error);

      Code.expect(function() {
        base.addAssociation();
      }).to.throw(Error);

      Code.expect(function() {
        base.removeAssociation();
      }).to.throw(Error);

      Code.expect(function() {
        base.addForeignKey();
      }).to.throw(Error);

      Code.expect(function() {
        base.removeForeignKey();
      }).to.throw(Error);

      Code.expect(function() {
        base.runSql();
      }).to.throw(Error);

      done();
    });

    lab.test('escapes single quotes', { parallel: true }, function(done) {

      Code.expect('Bill\'\'s Mother\'\'s House')
        .to.equal(base.escape('Bill\'s Mother\'s House'));
      done();
    });
  });
});
