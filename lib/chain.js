const Promise = require('bluebird');
const DEFAULT = [
  'renameCollection',
  'dropCollection',
  'createCollection',
  'createTable',
  'dropTable',
  'renameTable',
  'addColumn',
  'removeColumn',
  'renameColumn',
  'changeColumn',
  'addIndex',
  'removeIndex',
  'addForeignKey',
  'removeForeignKey'
];

class Chain {
  constructor (context, file, driver, internals) {
    this.file = file;
    this.context = context;
    this.driver = context;
    this.udriver = driver;
    this.internals = internals;
    this.chains = [];
    this.interfaces = [];
    this.it = 0;
    this._step = null;
    this._interface = null;

    DEFAULT.concat(Object.keys(this.context.learnable || [])).forEach(
      method => {
        this[method] = function (...args) {
          let cb = args.pop();
          if (typeof cb !== 'function') {
            args.push(cb);
            cb = undefined;
          }

          return Promise.resolve(
            this.exec.apply(this, [method].concat(args))
          ).asCallback(cb);
        };
      }
    );
  }

  addChain (chain) {
    this.chains.push(chain);
  }

  step () {
    this._step = this.chains[this.it];
    if (!this._step) return null;
    if (!this.interfaces[this.it]) {
      this.interfaces[this.it] = this._step.getInterface(
        this.context,
        this.file,
        this.udriver,
        this.internals
      );
    }

    this._interface = this.interfaces[this.it++];
    return this._step;
  }

  reset () {
    this.it = 0;
  }

  async exec (m, ...args) {
    let ret;
    let stat = [];
    while (this.step()) {
      ret = await this._interface[m].apply(this._interface, args);
      stat.push(ret);

      if (this._step.hasStateUsage) {
        this._step.useState(ret);
      }

      if (this._step.hasModification) {
        const ret = this._step.modify(
          this.context,
          this.udriver,
          this.internals
        );

        if (ret.driver) {
          this.udriver = ret.driver;
        }
      }
    }

    this.reset();
    return ret;
  }
}

module.exports = Chain;
