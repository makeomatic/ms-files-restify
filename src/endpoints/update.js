const validator = require('../validator.js');
const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'update';

exports.patch = {
  path: '/update',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function updateFileInformation(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { amqp, user } = req;
          const attributes = body.data.attributes;
          const message = { ...attributes };
          const username = user.id;

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
          res.send(204);
          return false;
        })
        .asCallback(next);
    },
  },
};
