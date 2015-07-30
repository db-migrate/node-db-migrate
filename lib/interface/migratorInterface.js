/**
  * The migrator interface provides the ability to handle all abilities which
  * are needed to successfully modify the DD of your tables.
  * This includes all DDL methods provided by SQL naturally.
  */

function dummy() {

  arguments[arguments.length - 1]('not implemented');
}

function MigratorInterface() {

}

MigratorInterface.prototype = {

  checkDBMS: dummy,

  createDatabase: dummy,

  switchDatabase: dummy,

  dropDatabase: dummy,

  bindForeignKey: dummy,

  createTable: dummy,

  dropTable: dummy,

  renameTable: dummy,

  addColumn: dummy,

  removeColumn: dummy,

  renameColumn: dummy,

  changeColumn: dummy,

  addIndex: dummy,

  removeIndex: dummy,

  addForeignKey: dummy,

  removeForeignKey: dummy,

  createMigrationsTable: dummy,

  createSeedsTable: dummy,

  normalizeColumnSpec: dummy,

  runSql: dummy,

  createColumnDef: dummy,

  mapDataType: dummy,

  createColumnConstraint: dummy,

  _makeParamArgs: dummy,

  recurseCallbackArray: dummy,

  allLoadedMigrations: dummy,

  allLoadedSeeds: dummy,

  addSeedRecord: dummy,

  startMigration: dummy,

  endMigration: dummy,

  addMigrationRecord: dummy,

  deleteMigration: dummy,

  deleteSeed: dummy,

  quoteDDLArr: dummy,

  quoteArr: dummy,

  escapeString: dummy,

  escape: dummy,

  escapeDDL: dummy,

  checkDBMS: dummy,

  all: dummy,

  close: dummy

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
