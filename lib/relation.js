var fs = require('fs'),
    log = require('./log');


var relations = {};

function Relation() {

}

Relation.prototype = {

    addRelation: function(table, column, relatedTable, relatedColumn) {

        relations[table] = relations[table] || {};
        relations[table][column] = relatedColumn;

    },

    getRelation: function(table, column) {

        return relations[table][column];
    },

    fromJson: function(file) {

        Relation = require(file);

        log.info( "Read Relations from file " + file );
    },

    toJson: function(file) {

        fs.writeFile(file, JSON.stringify(relations), function(err) {

            if(err) {
                throw err;
            }

            log.info( "Wrote Relations to file " + file );
        });
    },

    clearRelations: function() {

        relations = {};
    }
};
