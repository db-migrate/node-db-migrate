/**
 * Our first transition is actually the removal of globals and
 * introducing the setup routine.
 * Thus the body of this transition is just an empty function, but displays
 * as all transitions an explanation to the user.
 */
module.exports = {
  transition: function () {},

  message: function () {
    console.log(
      'Congratulations!\n\n' +
        'You just migrated from protocol 0 to 1!\n' +
        'What does that mean for you?\n' +
        'Quite simple, from 0 to 1 we introduced the setup function and we ' +
        'deprecated some globals, like async or dbm. What this transition does is' +
        ' grabbing your migrations, replacing the async and dbm definitions and ' +
        'inserting the setup body if not present.\n' +
        'It might be possible, that you still run into errors, for example if ' +
        'you already have had a setup body, it wont be replaced and you might ' +
        'be missing the default routine of the setup, which provides for example ' +
        'the dataTypes to your migration.\n\n' +
        'What do I need to do now?\n' +
        'Try to rexecute all of your migrations and watch if you run into any ' +
        'Errors, if you encounter any, you need to manually fix those ' +
        "problems. But don't worry, this protocol transitions happen very " +
        'rarely!\n'
    );
  }
};
