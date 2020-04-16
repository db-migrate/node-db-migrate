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

let rollbackCounter = 0;
let rollbackSignal = null;
let signal = null;
let counter = 0;

const dbmControl = {
  inc: () => {
    ++counter;
  },

  signal: () => {
    signal = true;
  },

  hasSignaled: () => {
    return signal;
  },

  previousSignal: () => {
    const r = rollbackSignal;
    // we reset on retrieval and mark as retrieved
    rollbackSignal = rollbackSignal === null ? null : false;
    return r;
  },

  get: () => {
    return counter;
  },

  getPrevious: () => {
    const r = rollbackCounter;

    // we reset on retrieval and mark as retrieved
    rollbackCounter = rollbackCounter > 0 ? false : 0;

    return r;
  }
};

class Chain {
  constructor (context, file, driver, internals) {
    this.file = file;
    this.context = context;
    this.driver = context;
    this.udriver = driver;
    if (this.udriver._dbmControl !== true) {
      this.udriver._counter = dbmControl;
      this.udriver._dbmControl = true;
      const runSql = this.udriver.runSql;
      this.udriver._dbmControlRSQL = runSql;

      // couple runSql
      this.udriver.runSql = function (...args) {
        return runSql.apply(this, args).then(x => {
          ++counter;
          return x;
        });
      };
    }
    this.internals = internals;
    this.chains = [];
    this.interfaces = [];
    this.it = 0;
    this._step = null;
    this._interface = null;

    DEFAULT.concat(Object.keys(this.context.learnable || [])).forEach(
      method => {
        this[method] = function (...args) {
          // we don't handle any callbacks here, v2 ultimately deprecates them

          this.transferInt();

          return this.exec.apply(this, [method].concat(args));
        };
      }
    );
  }

  transferInt () {
    rollbackCounter = counter;
    counter = 0;
    rollbackSignal = signal;
    signal = null;
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
    const stat = [];
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
