var fs = require('fs');
var log = require('db-migrate-shared').log;

function Relation () {
  this.relations = {};
}

Relation.prototype = {
  addRelation: function (table, column, relatedTable, relatedColumn) {
    this.relations[table] = this.relations[table] || {};
    this.relations[table][column] = relatedColumn;
  },

  getRelation: function (table, column) {
    return this.relations[table][column];
  },

  fromJson: function (file) {
    // Relation = require(file);

    log.info('Read Relations from file ' + file);
  },

  toJson: function (file) {
    fs.writeFile(file, JSON.stringify(this.relations), function (err) {
      if (err) {
        throw err;
      }

      log.info('Wrote Relations to file ' + file);
    });
  },

  clearRelations: function () {
    this.relations = {};
  }
};
