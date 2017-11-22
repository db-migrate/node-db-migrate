var prompt = require('prompt');

function ask (schema, callback) {
  console.log('Starting transition helper...\n');

  prompt.start();

  prompt.get(schema, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (result.safe === 'n') {
      console.log('Aborted transition helper!');
      callback(new Error('Aborted transition.'));
    } else {
      callback(null, result);
    }
  });
}

module.exports = ask;
