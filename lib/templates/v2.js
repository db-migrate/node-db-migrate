'use strict';

module.exports = () => `'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  return null;
};

exports._meta = {
  version: 2
};`;
