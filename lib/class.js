'use strict';

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
let initializing = false;

/*eslint-disable */
var fnTest = /xyz/.test(function() {
  xyz; // lgtm [js/useless-expression]
})
  ? /\b_super\b/
  : /.*/;
/* eslint-enable */

// The base Class implementation (does nothing)
const Class = function () {};

// Create a new Class that inherits from this class
Class.extend = function ext (prop) {
  const _super = this.prototype;

  // Instantiate a base class (but only create the instance,
  // don't run the init constructor)
  initializing = true;
  const prototype = new this();
  initializing = false;

  // Copy the properties over onto the new prototype
  for (const name in prop) {
    // Check if we're overwriting an existing function
    prototype[name] =
      typeof prop[name] === 'function' &&
      typeof _super[name] === 'function' &&
      fnTest.test(prop[name])
        ? (function (name, fn) {
            return function () {
              const tmp = this._super;

              // Add a new ._super() method that is the same method
              // but on the super-class
              this._super = _super[name];

              // The method only need to be bound temporarily, so we
              // remove it when we're done executing
              const ret = fn.apply(this, arguments);
              this._super = tmp;

              return ret;
            };
          })(name, prop[name])
        : prop[name];
  }

  // The dummy class constructor
  function Class () {
    // All construction is actually done in the init method
    if (!initializing && this.init) {
      this.init.apply(this, arguments);
    }
  }

  // Populate our constructed prototype object
  Class.prototype = prototype;

  // Enforce the constructor to be what we expect
  Class.prototype.constructor = Class;

  // And make this class extendable
  Class.extend = ext;

  return Class;
};

module.exports = Class;
