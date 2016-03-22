const validator = require('../validator.js');
const config = require('../config.js');
const get = require('lodash/get');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'update';

exports.post = {
  path: '/update/:uploadId',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function updateFileInformation(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { amqp } = req;
          const { uploadId } = req.params;
          const { meta } = body.data;
          const isAdmin = req.user.isAdmin();
          const message = { meta, uploadId, isAdmin };
          const username = get(req, 'user.id');

          if (username) {
            message.username = username;
          }

          return req.amqp.publishAndWait(
            getRoute(ROUTE_NAME),
            message,
            { timeout: getTimeout(ROUTE_NAME) }
          );
        })
        .then(result => {
          res.send(201, {
            type: 'update',
            id: result.uploadId,
            result
          });
          return false;
        })
        .asCallback(next);
    },
  },
};
