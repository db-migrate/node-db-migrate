var Code = require('@hapi/code'); // assertion library
var Lab = require('@hapi/lab');
var lab = exports.lab = Lab.script();
var sinon = require('sinon');
var shadow = require('../../lib/driver/shadow.js');

lab.experiment('shadow', function () {
  lab.test('shadow function and original function get called in serial',
    function () {
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
      });
    });
});
