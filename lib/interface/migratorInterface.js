
function MigratorInterface() {

}

MigratorInterface.prototype = {

  checkDBMS: function() {

    arguments[arugments.length - 1]('not implemented');
  },


  createDatabase: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  switchDatabase: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  dropDatabase: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  bindForeignKey: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  createTable: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  dropTable: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  renameTable: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  addColumn: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  removeColumn: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  renameColumn: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  changeColumn: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  addIndex: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  insert: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  removeIndex: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  addForeignKey: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  removeForeignKey: function() {

    arguments[arugments.length - 1]('not implemented');
  },

  runSql: function() {

    arguments[arugments.length - 1]('not implemented');
  }
};

module.exports = MigratorInterface;
