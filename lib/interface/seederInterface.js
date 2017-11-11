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
  * you want. This might be handy when initializing a new development
  * environment, but not if you want to use it for the production environment.
  *
  * The second seeder type, the version controlled seeders, short VC Seeds,
  * is targeting the production environment and development environment.
  * There is technically no big difference between them, except the following
  * details:
  *
  * A VC Seed can be called from a migration, via seed.execute and seed.link. A
  * normal seeder can not. Also A VC Seeder has a down and up function, like
  * the way the migrations work, the static has a truncate function instead,
  * which gets called before the seed function. This is because a seeder is
  * mostly used to initialize something, a VC Seeder instead is used to
  * populate changes made to the dataset and to have a clear separation of
  * DDL and Data Maniupulations.
  * And last but not least, a VC Seed can not be executed if it was already
  * executed. You will need to roll back it first, it just acts pretty similar
  * to migrations. A normal seed can be executed just as often as you want
  * without the need to rollback your data.
  *
  * To note: If you rollback a migration, linked to a seeder, db-migrate will
  * also rollback the seed. This is also a reason why you can't rollback a
  * specific migration, you would going to break that much, you probably loose
  * a bunch of valueable time.
  */

var Promise = require('bluebird');

function insert (table, options, callback) {
  var foreignLinkage = this.foreignLinkage[table];

  for (var o = 0; o < options.length; ++o) {
    var option = Object.keys(options[o]);

    for (var i = 0; i < option.length; ++i) {
      if (typeof options[option[i]] === 'object') {
        if (options[option[i]].type === 'lookup') {
          if (!options[option[i]].table) {
            if (foreignLinkage[option[i]]) {
              options[option[i]].table = foreignLinkage[option[i]].table;
              options[option[i]].field = foreignLinkage[option[i]].field;
            } else {
              return Promise.reject(
                new Error('missing foreign key linkage!')
              ).nodeify(callback);
            }
          }
        }
      }
    }
  }

  return lookup(options)
    .then(function () {
      return this.driver.insert(options);
    })
    .catch(function (e) {
      throw e;
    })
    .nodeify(callback);
}

function lookup (options) {
  var lookups = [];
  var i = 0;

  for (var o = 0; o < options.length; ++o) {
    var option = Object.keys(options[o]);

    for (; i < option.length; ++i) {
      if (typeof options[option] === 'object') {
        if (options[option].type === 'lookup') {
          lookups.push(
            this.driver.lookup(options[option]).catch(function (err) {
              throw err;
            })
          );
        }
      }
    }
  }

  return Promise.settle(lookups);
}

function dummy () {
  arguments[arguments.length - 1]('not implemented');
}

var SeederInterface = {
  lookup: dummy,

  insert: dummy,

  delete: dummy,

  runSql: dummy,

  buildWhereClause: dummy,

  quoteDDLArr: dummy,

  quoteArr: dummy,

  escapeString: dummy,

  escape: dummy,

  escapeDDL: dummy,

  checkDBMS: dummy,

  update: dummy,

  truncate: dummy,

  switchDatabase: dummy,

  remove: dummy,

  close: dummy
};

module.exports = SeederInterface;
module.exports.deprecated = {};
module.exports.extending = {
  _l: function (field) {
    return { type: 'lookup', field: field };
  },
  __Test__insert: insert,
  __Test__lookup: lookup
};
