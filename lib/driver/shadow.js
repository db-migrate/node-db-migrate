/**
 * The shadow driver is basically a MITM object. Or in other words:
 *
 * This shadow is very infectius. It infects other objects and overwrite their
 * behavior. It gets a shadow part of this object and executes various
 * actions.
 *
 * In our case, it records the execution of methods.
 */

/**
 * 'Infect' the original class
 */
exports.infect = function (db, intern, ShadowProto) {
  const newDb = {};
  if (db._shadowsHost || db._shadowProto) {
    throw new Error("Can't shadow a shadow!");
  }
  newDb._shadowsHost = {};
  newDb._shadowProto = {};

  for (var prop in db) {
    if (
      typeof ShadowProto[prop] === 'function' &&
      typeof db[prop] === 'function'
    ) {
      newDb._shadowsHost[prop] = db[prop];
      newDb._shadowProto[prop] = ShadowProto[prop];

      (function (property) {
        newDb[property] = function () {
          var params = arguments;
          var self = this;

          return self._shadowProto[property]
            .apply(self, params)
            .then(function () {
              return self._shadowsHost[property].apply(self, params);
            });
        };
      })(prop);
    } else {
      newDb[prop] = db[prop];
    }
  }

  return newDb;
};

/**
 * 'Overshadow' the original class
 *
 * This basically overwrites methods existent from the original
 * with a provided replacement. If no replacement was found, it will overwrite
 * with an error instead, which needs to be supplied as a fallback.
 */

exports.overshadow = function (db, ShadowProto, ShadowError) {
  const newDb = Object.assign({}, ShadowProto);
  newDb.prototype = Object.assign({}, ShadowProto.prototype);

  for (var prop in db) {
    if (
      typeof ShadowProto[prop] === 'function' &&
      typeof db[prop] === 'function'
    ) {
      newDb[prop] = ShadowProto[prop];
    } else if (typeof db[prop] === 'function') {
      newDb[prop] = ShadowError(prop);
    }
  }

  return newDb;
};
