var Promise = require('bluebird');

function insert(table, options, callback) {

  var foreignLinkage = this.foreignLinkage[table];

  for(var o = 0; o < options.length; ++o)
  {
    var option = Object.keys(options[o]);

    for(var i = 0; i < option.length; ++i) {

      if (typeof(options[option]) === 'object') {

        if (options[option].type === 'lookup') {

          if (!options[option].table) {

            if (foreignLinkage[option]) {

              options[option].table = foreignLinkage[option].table;
              options[option].field = foreignLinkage[option].field;
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

  return lookup(options, 0)
  .catch(callback)
  .then(function(){

    return this.driver.massInsert(options);
  })
  .catch(callback)
  .nodeify(callback);
}

function lookup(options, i, callback) {

  var lookups = [];

  for(var o = 0; o < options.length; ++o)
  {
    var option = Object.keys(options[o]);

    for(; i < option.length; ++i) {

      if (typeof(options[option]) === 'object') {

        if (options[option].type === 'lookup') {

          lookups.push(this.driver.lookup(options[option])
          .catch(function(err) {

            console.log(err);
          })
          .then(function() {

              return loockup(options, i);
          }));
        }
      }
    }
  }

  return Promise.all(lookups).nodeify(callback);
}
