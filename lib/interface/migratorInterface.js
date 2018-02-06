/**
 * The migrator interface provides the ability to handle all abilities which
 * are needed to successfully modify the DD of your tables.
 * This includes all DDL methods provided by SQL naturally.
 *
 * Considering the zero downtime deployment we are handling migrations like
 * the following:
 *
 * Zero Downtime notes
 *
 *  *) The very first step is always a full dump, for the sake of security
 *
 * - all operations that are deleting a currently existing column, e.g. renaming a column:
 *      - 1. duplicate the column
 *   - if renamed:
 *      -  1. create a trigger to update both columns
 *      -  2. disable/delete trigger after successful deployment
 *   - if deleted:
 *      - 1. apply steps from the renaming process
 *      - 2. create a backup of this column (+PK)/table and delete it afterwards (after the successful deployment)
 * - all operations that modify content
 *   - 1. Retrieve data to be applied
 *   - 2. Extract PKs of to be updated rows
 *   - 3. Create backup of to be updated rows
 *   - 4. Apply changes
 */

function dummy () {
  arguments[arguments.length - 1]('not implemented');
}

function MigratorInterface () {}

MigratorInterface.prototype = {
  renameCollection: dummy,

  dropCollection: dummy,

  createCollection: dummy,

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

  all: dummy,

  close: dummy,

  insert: dummy
};

module.exports = MigratorInterface;
module.exports.deprecated = {};

module.exports.extending = {};

module.exports.exclude = {};
