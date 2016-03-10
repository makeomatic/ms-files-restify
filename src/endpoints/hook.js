const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'finish';

/**
 * @api {patch} / notifies about completed file upload
 * @apiVersion 1.0.0
 * @apiName FinishUpload
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription Sets status of the file to uploaded and puts it into post-processing queue. Returns location of the file
 * and code 202. It means that file had been pushed to post processing queue, but still not available for download. Client should
 * poll status of this file in order to find out when it's ready. 412 error will be returned until it's available for download
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 *     "Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Body) {Object} data                         data container
 * @apiParam (Body) {String="upload"} data.type           data type, must be "upload"
 * @apiParam (Body) {String} data.id                      upload id
 *
 * @apiExample {curl} Example usage:
 *   curl -X PATCH -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox.cappacity.matic.ninja/api/files" -d '{
 *       "data": {
 *         "type": "upload",
 *         "id": "asd142asas_127x3d18"
 *       }
 *     }'
 *
 * @apiUse FileNotFoundError
 * @apiUse ValidationError
 * @apiUse ForbiddenResponse
 * @apiUse UnauthorizedError
 * @apiUse NotAllowedError
 * @apiUse PreconditionFailedError
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
