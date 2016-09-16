const ld = require('lodash');
const users = require('ms-users-restify');

const BLACK_LIST = ['reconfigure', 'getTimeout', 'getRoute'];

/**
 * Default configuration object
 * @type {Object}
 */
const config = module.exports = {
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
      access: 'access',
      get: 'get',
      update: 'update',
    },
    timeouts: {},
    gce: {
      bucket: '',
      token: '',
      channel: '',
    },
  },
};

/**
 * Returns configuration instance
 * @return {Object}
 */
module.exports = exports = config;

/**
 * Reconfigures instance
 */
exports.reconfigure = function reconfigure(opts) {
  ld.merge(config, ld.omit(opts, BLACK_LIST));
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
  return [files.prefix, files.postfix[route] || route].join('.');
};
