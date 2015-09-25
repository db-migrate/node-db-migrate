this.isSilent = false;

var logLevel = 15,
    escape = '"',
    level = {
    sql: 8,
    error: 4,
    warn: 2,
    info: 1
  };

exports.setLogLevel = function( log ) {

  if( typeof(log) === 'object' ) {

    logLevel = 0;

    var keys = Object.keys(log);

    for( var i = 0, len = keys.length; i < len ; ++i ) {

      logLevel = logLevel | (level[keys[i]] || 0);
    }
  }
  else if( typeof(log) === 'string' ) {

    logLevel = 0;
    log.split( '|' ).map( function (key) {

      logLevel = logLevel | (level[key] || 0);
    });
  }

};

exports.setEscape = function( escapeChar ) {

  if(typeof(escape) === 'string') {

    escape = escapeChar;
  }
};

exports.silence = function (isSilent) {
  return ( this.isSilent = isSilent );
};
exports.info = function () {
  if ((!this.isSilent || global.verbose) &&
        logLevel & level.info) {
    Array.prototype.unshift.call(arguments, '[INFO]');
    console.info.apply(console, arguments);
  }
};
exports.warn = function () {
  if ((!this.isSilent || global.verbose) &&
       logLevel & level.warn) {
    Array.prototype.unshift.call(arguments, '[WARN]');
    console.warn.apply(console, arguments);
  }
};
exports.error = function () {
  if ((!this.isSilent || global.verbose) &&
        logLevel & level.error) {
    Array.prototype.unshift.call(arguments, '[ERROR]');
    //console.trace( 'Trace from error log' );
    console.error.apply(console, arguments);
  }
};
exports.sql = function(sql) {
  if ((!this.isSilent && (global.dryRun || global.verbose))  &&
        logLevel & level.sql) {
    var args = Array.prototype.slice.call(arguments).slice(1);
    args = args.slice(0, args.length - 1);
    if(global.verbose) {
      if(args.length > 0) {
        console.log('[SQL]', sql, args);
      } else {
        console.log('[SQL]', sql);
      }
    }
    if (global.dryRun) {
      if(args.length > 0) {
        if (logLevel === level.sql) {

          if( sql.indexOf('?') !== -1 ) {

            var split = sql.split('?');
            var logSql = split[0];

            for (var i = 1, len = split.length; i < len; ++i) {

              if( typeof(args[i - 1]) === 'string' ) {
                logSql += escape + args[i - 1] + escape + split[i];
              }
              else {
                logSql += escape + args[0][i - 1] + escape + split[i];
              }
            }

            console.log( logSql + ';' );
          }
          else if( sql.indexOf('$1') !== -1 ) {

            var logSql = sql;

            for( var i = 0, len = args[0].length; i < len; ++i ) {

              logSql = logSql.replace( '$' + (i + 1), escape +
                args[0][i] + escape );
            }

            console.log( logSql + ';' );
          }
          else {

            console.log(sql, args);
          }
        }
        else {

          console.log(sql, args);
        }
      } else {
        console.log(sql + ';');
      }
    }
  }
};

exports.verbose = function() {
  if (global.verbose) {
    Array.prototype.unshift.call(arguments, '[INFO]');
    console.log.apply(console, arguments);
  }
};
