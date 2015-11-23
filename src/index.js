const utils = require('restify-utils');
const path = require('path');
const config = require('./config.js');
const users = require('ms-users-restify');

// generate attach function
const attach = module.exports = utils.attach(
  config,
  path.resolve(__dirname, './endpoints'),
  path.resolve(__dirname, './middleware')
);

// reference user's middleware as we want to reuse it
attach.middleware.auth = users.middleware.auth;

// expose reconfiguration
attach.reconfigure = config.reconfigure;
