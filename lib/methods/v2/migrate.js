module.exports = {
  // executes the instructions on the database
  executes: true,

  getInterface (context, file, driver) {
    return driver;
  }
};
