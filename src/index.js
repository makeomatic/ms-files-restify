const utils = require('restify-utils');
const path = require('path');
const config = require('./config.js');
const users = require('ms-users-restify');
const defaults = require('lodash/defaults');

// generate attach function
const attach = module.exports = utils.attach(
  config,
  path.resolve(__dirname, './endpoints'),
  path.resolve(__dirname, './middleware')
);

// reference user's middleware as we want to reuse it
defaults(attach.middleware, users.middleware);

// expose reconfiguration
attach.reconfigure = config.reconfigure;
