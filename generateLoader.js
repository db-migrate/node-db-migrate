'use strict';

const path = require('path');
const recursive = require('final-fs').readdirRecursive;
const start = path.join(__dirname, 'lib/commands');
const Promise = require('bluebird');
const fs = require('fs');

(async () => {
  const files = await recursive(start, true);
  const template = `
'use strict';

const path = require('path');

const files = {
${files
    .map(x => `  "${x.substring(0, x.indexOf('.js'))}": require('./${x}')`)
    .join(',\n')}
}

function register (module) {
  return files[module];
}

module.exports = register;
`;

  fs.writeFile(
    path.join(__dirname, 'lib/commands/generated.js'),
    template,
    'utf8',
    err => {
      if (err) throw err;
    }
  );
})();
