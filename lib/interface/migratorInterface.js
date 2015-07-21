/**
  * The migrator interface provides the ability to handle all abilities which
  * are needed to successfully modify the DD of your tables.
  * This includes all DDL methods provided by SQL naturally.
  */

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

  removeIndex: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  addForeignKey: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  removeForeignKey: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  createMigrationsTable: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  createSeedsTable: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  normalizeColumnSpec: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  runSql: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  createColumnDef: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  mapDataType: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  createColumnConstraint: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  _makeParamArgs: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  recurseCallbackArray: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  allLoadedMigrations: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  allLoadedSeeds: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  addSeedRecord: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  startMigration: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  endMigration: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  addMigrationRecord: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  deleteMigration: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  deleteSeed: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  quoteDDLArr: function() {

      arguments[arguments.length - 1]('not implemented');
  },

  quoteArr: function() {

      arguments[arguments.length - 1]('not implemented');
  },

  escapeString: function() {

      arguments[arguments.length - 1]('not implemented');
  },

  escape: function() {

      arguments[arguments.length - 1]('not implemented');
  },

  escapeDDL: function() {

      arguments[arguments.length - 1]('not implemented');
  },

  checkDBMS: function() {

      arguments[arguments.length - 1]('not implemented');
  },

  all: function() {

    arguments[arguments.length - 1]('not implemented');
  },

  close:  function() {

    arguments[arguments.length - 1]('not implemented');
  }

};


module.exports = MigratorInterface;
module.exports.deprecated = {

    insert: function() {

        arguments[arguments.length - 1]('not implemented');
    },

    insert_deprecation: 'is going to be completely removed, use version controlled seeds instead.'
};

module.exports.extending = {
};

module.exports.exclude = {

};
