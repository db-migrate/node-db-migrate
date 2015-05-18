/**
  * The shadow driver is basically a MITM object. Or in other words:
  *
  * This shadow is very infectius. It infects other objects and overwrite their
  * behavior. It gets a shadow part of this object and executes various
  * actions.
  *
  * In our case, it records the execution of methods.
  */


var internals = {};

function Shadow(db) {

  this.db = db;
}


/**
  * 'Infect' the original class
  */
exports.infect = function(db, intern, ShadowProto) {

  internals = intern;

  db._shadowsHost = {};
  db._shadowProto = {};

  for(var prop in db) {

    if (typeof ShadowProto[prop] === "function" &&
        typeof db[prop] === "function") {

      db._shadowsHost[prop] = db[prop];
      db._shadowProto[prop] = ShadowProto[prop];

      (function(property) {

        db[property] = function() { 
            var params = arguments,
                callback;

            return this._shadowProto[property].apply(this, params)
            .then( function() { 
                return this._shadowsHost[property].apply(this, params);
            }.bind(this));
        };
      }(prop));
    }
  }

  return db;
};
