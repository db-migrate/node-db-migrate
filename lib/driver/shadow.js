/**
  * The shadow driver is basically a MITM object. Or in other words:
  *
  * This shadow is very infectius. It infects other objects and overwrite their
  * behavior. It gets a shadow part of this object and executes various
  * actions.
  *
  * In our case, it records the execution of methods.
  */

function Shadow(db) {

  this.db = db;
}


var ShadowProto = {

  createTable: function() {},
  addForeignKey: function() {},
  createCollection: function() {}

};


/**
  * 'Infect' the original class
  */
exports.infect = function(db) {

  db._shadowsHost = {};

  for(var prop in db) {

    if (typeof ShadowProto[prop] === "function" &&
        typeof db[prop] === "function") {

      db._shadowsHost[prop] = db[prop];

      (function(property) {
        db[property] = function() { this._shadowsHost[property].apply(this, arguments); };
      }(prop));
    }
  }

  return db;
};
