const validator = require('../validator.js');
const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'update';

exports.post = {
  path: '/update/:filename',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function updateFileInformation(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { amqp } = req;
          const { filename } = req.params;
          const meta = body.data.meta;
          const message = { meta, uploadId: filename };
          const username = get(req, 'user.id');

          if (username) {
            message.username = username;
          }

          return req.amqp.publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
        })
        .then(result => {
          console.log(result);
          res.send(200, {
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
