var fs = require('fs');
var fspath = require('path');

exports.rm_r = function rm_r(path, callback) {
  fs.stat(path, function(err, stats) {
    if (err) {
      if (err.errno == 34) {
        callback(null);
      } else {
        callback(err);
      }
      return;
    }

    if (stats.isFile()) {
      fs.unlink(path, callback);
    } else if (stats.isDirectory()) {
      fs.readdir(path, function(err, files) {
        if (files.length == 0) {
          fs.rmdir(path, callback);
        } else {
          files.forEach(function(file, index) {
            rm_r(fspath.join(path, file), function(err) {
              if (index == files.length - 1) {
                fs.rmdir(path, callback);
              }
            });
          });
        }
      });
    }
  });
};
