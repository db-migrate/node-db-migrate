var inquirer = require('inquirer');

function ask(question, callback) {
  console.log('Starting transition helper...\n');

  console.log(question.description);

  inquirer
    .prompt([question])
    .then(function (result) {
      if (!result.safe) {
        console.log('Aborted transition helper!');
        callback(new Error('Aborted transition.'));
      } else {
        callback(null, result);
      }
    })
    .catch(function (err) {
      callback(err);
    });
}

module.exports = ask;
