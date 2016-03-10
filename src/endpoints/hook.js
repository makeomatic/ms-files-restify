const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'finish';

/**
 * @api {post} /gce notifies about completed file upload
 * @apiVersion 1.0.0
 * @apiName FinishUpload
 * @apiGroup Files
 * @apiPermission gce
 *
 * @apiDescription Sets status of the file to uploaded and puts it into post-processing queue. Returns location of the file
 * and code 202. It means that file had been pushed to post processing queue, but still not available for download. Client should
 * poll status of this file in order to find out when it's ready. 412 error will be returned until it's available for download
 *
 * @apiSuccessExample {json} Success-Finish:
 *     HTTP/1.1 202 Accepted
 */
exports.post = {
  path: '/gce',
  middleware: ['gce'],
  handlers: {
    '1.0.0': function completeResumableUpload(req, res, next) {
      // we do not process delete actions at this point
      if (req.file.action === 'not_exists') {
        res.send(200);
        return next(false);
      }

      const message = { filename: req.file.name };

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then(() => 'OK')
        .catch({ code: 202 }, err => `202: ${err.message}`)
        .catch({ code: 412 }, err => `412: ${err.message}`)
        .then(msg => {
          res.send(202, msg);
          return false;
        })
        .asCallback(next);
    },
  },
};
