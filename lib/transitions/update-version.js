var balanced = require('balanced-match');
var fs = require('fs');

function updateVersion (required, migration, internals, version) {
  var data = fs.readFileSync(migration.path, 'utf8');
  var searchString = 'exports.down';
  var balance;
  var metaIndex;
  var plus = 1;
  var sub;

  if (required._meta) {
    searchString = 'exports._meta';
  }

  metaIndex = data.indexOf(searchString);
  sub = data.substring(metaIndex);
  balance = balanced('{', '}', sub);

  if (sub[balance.end + 1] === ';') {
    ++plus;
  }

  sub = sub.substring(0, balanced.end);

  if (required._meta) {
    required._meta.version = version;

    data =
      data.substring(0, metaIndex) +
      sub.replace(
        sub.substring(balance.start, balance.end + 1),
        JSON.stringify(required._meta, null, 2)
      ) +
      data.substring(metaIndex + balance.end + plus);
  } else {
    data =
      data.substring(0, metaIndex + balance.end + plus) +
      '\n\nexports._meta = ' +
      JSON.stringify({ version: version }, null, 2) +
      ';' +
      data.substring(metaIndex + balance.end + plus);
  }

  fs.writeFileSync(migration.path, data, 'utf8');
}

module.exports = updateVersion;
