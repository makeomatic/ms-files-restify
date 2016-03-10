const utils = require('restify-utils');
const path = require('path');
const config = require('./config.js');
const users = require('ms-users-restify');
const assign = require('lodash/assign');

// generate attach function
const attach = module.exports = utils.attach(
  config,
  path.resolve(__dirname, './endpoints'),
  path.resolve(__dirname, './middleware')
);

// reference user's middleware as we want to reuse it
attach.middleware = assign({}, users.middleware, attach.middleware);

// expose reconfiguration
attach.reconfigure = config.reconfigure;
