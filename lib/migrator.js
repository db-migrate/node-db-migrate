
var Class = require('./class');

module.exports = Migrator = Class.extend({
  init: function(db) {
    this.db = db;
  },

  up: function(upCallback, doneCallback) {
    var self = this;
    var workingCount = 0;
    var errors = [];

    var onError = function(err) {
      errors.push(err);
    };
    var onStart = function() {
      workingCount++;
    };
    var onEnd = function() {
      workingCount--;
      if (workingCount == 0) {
        self.db.removeListener('start', onStart);
        self.db.removeListener('end', onEnd);
        self.db.removeListener('error', onError);
        if(errors.length > 0) {
          doneCallback(errors);
        } else {
          doneCallback(null);
        }
      }
    };

    this.db.on('start', onStart);
    this.db.on('end', onEnd);
    this.db.on('error', onError);

    upCallback(this.db);
  },

  down: function(downCallback, doneCallback) {
    var self = this;
    var workingCount = 0;
    var errors = [];

    var onError = function(err) {
      errors.push(err);
    };
    var onStart = function() {
      workingCount++;
    };
    var onEnd = function() {
      workingCount--;
      if (workingCount == 0) {
        self.db.removeListener('start', onStart);
        self.db.removeListener('end', onEnd);
        self.db.removeListener('error', onError);
        if(errors.length > 0) {
          doneCallback(errors);
        } else {
          doneCallback(null);
        }
      }
    };

    self.db.on('start', onStart);
    self.db.on('end', onEnd);
    self.db.on('error', onError);

    downCallback(self.db);
  }
});