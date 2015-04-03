
function MigratorInterface() {

}

MigratorInterface.prototype = {

  checkDBMS: function() {

    arguments[arguments.length - 1]('not implemented');
  },


  createDatabase: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  switchDatabase: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  dropDatabase: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  bindForeignKey: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  createTable: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  dropTable: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  renameTable: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  addColumn: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  removeColumn: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  renameColumn: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  changeColumn: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  addIndex: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  insert: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  removeIndex: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  addForeignKey: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  removeForeignKey: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  runSql: function() {

    arguments[arguments.length - 1]('not implemented');
  }
};


module.exports.MigratorInterface = MigratorInterface;
module.exports.deprecated = {};
module.exports.extending = {
};
