const ld = require('lodash');
const users = require('ms-users-restify');

/**
 * Default configuration object
 * @type {Object}
 */
const config = {
  files: {
    prefix: 'files',
    postfix: {
      upload: 'upload',
      download: 'download',
      info: 'info',
      finish: 'finish',
      process: 'process',
      list: 'list',
    },
  },
};

/**
 * Returns configuration object
 * @return {Object}
 */
exports.get = function returnConfigurationObject() {
  return config;
};

/**
 * Reconfigures instance
 */
exports.reconfigure = function reconfigure(opts) {
  ld.merge(config, opts);
  users.reconfigure(config);
};
