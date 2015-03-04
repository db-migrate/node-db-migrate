
function insert(table, options, callback) {

  var foreignLinkage = this.foreignLinkage[table];

  for(var o = 0; o < options.length; ++o)
  {
    var option = Object.keys(options[o]);

    for(var i = 0; i < option.length; ++i) {

      if (typeof(options[option]) === 'object') {

        if (options[option].type === 'loockup') {

          if (!options[option].table) {

            if (foreignLinkage[option]) {

              options[option].table = foreignLinkage[option].table;
              options[option].field = foreignLinkage[option].field;
            }
            else {

              callback('missing foreign key linkage!', null);
            }
          }
        }
      }
    }
  }

  return loockup(options)
  .catch(callback)
  .then(function(){

    return this.driver.massInsert(options);
  })
  .catch(callback)
  .nodeify(callback);
}