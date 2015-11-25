const ld = require('lodash');
const users = require('ms-users-restify');

/**
 * Default configuration object
 * @type {Object}
 */
const config = {
  users: {},
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
    timeouts: {},
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

/**
 * returns timeout for a route
 */
exports.getTimeout = function getTimeout(route) {
  return config.files.timeouts[route] || 5000;
};

/**
 * Returns text route
 */
exports.getRoute = function getRoute(route) {
  const files = config.files;
  return [files.prefix, files.postfix[route]].join('.');
};
