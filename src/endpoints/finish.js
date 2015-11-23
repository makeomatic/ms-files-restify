const validator = require('../validator.js');
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
 * poll status of this file in order to find out when it's ready
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 * 		"Authorization: JWT myreallyniceandvalidjsonwebtoken"
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
 *     }' | gunzip
 *
 * @apiUse UserAuthResponse
 * @apiUse ValidationError
 *
 * @apiSuccessExample {json} Success-Finish:
 * 		HTTP/1.1 202 Accepted
 * 		Location: https://api-sandbix.cappacity.matic.ninja/api/files/49058df9-983e-43b6-8755-84b92c272357"
 */
exports.post = {
  path: '/',
  middleware: [ 'auth' ],
  handlers: {
    '1.0.0': function completeResumableUpload(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { id } = body.data;
          const message = { id, username: req.user.id };

          return req.amqp.publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
        })
        .then(result => {
          res.setHeader('Location', config.host + config.attachPoint + '/' + result.filename);
          res.send(202);
        })
        .asCallback(next);
    },
  },
};
