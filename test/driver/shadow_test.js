var Code = require('code'); // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var sinon = require('sinon');
var Bluebird = require('bluebird');
var shadow = require('../../lib/driver/shadow.js');

lab.experiment('shadow', function () {
  lab.test('shadow function and original function get called in serial',
    function (done) {
      var stub = sinon.stub().callsArg(0);
      var shadowStub = sinon.stub().resolves();
      var infected = shadow.infect({
        test: stub
      }, {}, {
        test: shadowStub
      });

      infected.test(function () {
        Code.expect(shadowStub.calledOnce).to.be.true();
        Code.expect(stub.calledOnce).to.be.true();
        done();
      });
    });
});
