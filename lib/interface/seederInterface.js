/**
  * The seeder interface provides the ability to handle all operations, that
  * are not DDL specific and thus not a migration.
  *
  * These operations are currently, but not limited to:
  *
  * inserting data
  * removing data
  * searching data
  * truncating whole tables
  *
  * This functionality is provided in two ways to the user. First there are
  * traditional seeder. You can call them whenever you want, and how often
  * you want. This results into a use case, that make seeders might only used
  * for development and not to use them in a deployment process.
  *
  * Here the second way of usage steps in, the version controlled seeders, in
  * short VC Seeds.
  * There is technically no big difference between them, except the following
  * details:
  *
  * A VC Seed can be called from a migration, via seed.execute and seed.link. A
  * normal seeder can not. Also A VC Seeder has a down and up function, like
  * the way the migrations work, the static instead has a truncate function,
  * which gets called before the seed function. As a seeder often wants to
  * truncate tables or just delete data from a table.
  * And last but not least, a VC Seed can not be executed if it was executed
  * before, you need to roll back it first, it's in short handled like
  * migrations are. A normal seed can be executed just as often as you want
  * without rollback your data at any time.
  *
  * To note: If you rollback a migration, linked to a seeder, db-migrate will
  * also rollback the seed. This is also a reason why you can't rollback a
  * specific migration, you would going to break that much, you probably loose
  * a bunch of valueable time.
  */

var Promise = require('bluebird');

function _l( field ) {

  return { type: 'lookup', field: field };
}

function insert(table, options, callback) {

  var foreignLinkage = this.foreignLinkage[table];

  for(var o = 0; o < options.length; ++o)
  {
    var option = Object.keys(options[o]);

    for(var i = 0; i < option.length; ++i) {

      if (typeof(options[option[i]]) === 'object') {

        if (options[option[i]].type === 'lookup') {

          if (!options[option[i]].table) {

            if (foreignLinkage[option[i]]) {

              options[option[i]].table = foreignLinkage[option[i]].table;
              options[option[i]].field = foreignLinkage[option[i]].field;
            }
            else {

              return Promise.reject('missing foreign key linkage!').
                nodeify(callback);
            }
          }
        }
      }
    }
  }

  return lookup(options)
  .then(function(){

    return this.driver.massInsert(options);
  })
  .catch(function(e) {

    throw e;
  })
  .nodeify(callback);
}

function lookup(options) {

  var lookups = [],
      i = 0;

  for(var o = 0; o < options.length; ++o)
  {
    var option = Object.keys(options[o]);

    for(; i < option.length; ++i) {

      if (typeof(options[option]) === 'object') {

        if (options[option].type === 'lookup') {

          lookups.push(this.driver.lookup(options[option])
          .catch(function(err) {

            throw err;
          }));
        }
      }
    }
  }

  return Promise.settle(lookups);
}

var SeederInterface = {

    lookup: function() {

        arguments[arguments.length - 1]('not implemented');
    },

    insert: function() {

        arguments[arguments.length - 1]('not implemented');
    },

    delete: function() {

        arguments[arguments.length - 1]('not implemented');
    },

    runSql: function() {

        arguments[arguments.length - 1]('not implemented');
    },
};

module.exports = SeederInterface;
module.exports.deprecated = {

};
module.exports.extending = {

    _l: function( field ) {

        return { type: 'lookup', field: field };
    }
};
