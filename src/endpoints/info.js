const validator = require('../validator.js');
const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'info';

/**
 * @api {get} /:filename returns information about specific file
 * @apiVersion 1.0.0
 * @apiName GetInfo
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription Returns information about specific file that belongs to a user. When status is `processed` - it can be downloaded
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 * 		"Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Params) {String} filename      name of the file
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox.cappacity.matic.ninja/api/files/49058df9-983e-43b6-8755-84b92c272357" | gunzip
 *
 * @apiUse UserAuthResponse
 *
 * @apiSuccess (Code 200) {Object} meta                           meta container
 * @apiSuccess (COde 200) {String} meta.id                        request id
 * @apiSuccess (Code 200) {Object} data                           data container
 * @apiSuccess (Code 200) {String} data.type                      "upload"
 * @apiSuccess (Code 200) {String} data.id                        upload id
 * @apiSuccess (Code 200) {Object} data.attributes                attributes container
 * @apiSuccess (Code 200) {String} data.attributes.name           custom name of the file
 * @apiSuccess (Code 200) {Number} data.attributes.startedAt      when file upload was started
 * @apiSuccess (Code 200) {String} data.attributes.status         status of the file, `pending`, `uploaded` or `processed`
 * @apiSuccess (Code 200) {String} data.attributes.contentType    content type of the file
 * @apiSuccess (Code 200) {Number} data.attributes.contentLength  size in bytes
 * @apiSuccess (Code 200) {String} data.attributes.owner          owner of the file
 * @apiSuccess (Code 200) {Object} data.links                     links container
 * @apiSuccess (Code 200) {String} data.links.self                resource link
 * @apiSuccess (Code 200) {String} data.links.owner               link to the owner of the file
 *
 * @apiSuccessExample {json} Success-Finish:
 * 		HTTP/1.1 200 OK
 * 		{
 * 			"meta": {
 * 				"id": "request-id"
 * 			},
 * 			"data": {
 * 				"type": "file",
 * 				"id": "49058df9-983e-43b6-8755-84b92c272357",
 * 				"attributes": {
 * 				  "name": "my extremely interesting model",
 * 					"startedAt": "1448363306185",
 * 					"status": "pending",
 * 					"contentType": "application/cappasity-3d",
 * 					"contentLength": 132718274182,
 * 					"md5Hash": "52dd9e7bbdef6ac7d345888c17fa5848",
 * 					"owner": "xxx@example.com"
 * 				},
 * 				"links": {
 * 					"self": "https://api-sandbox.cappacity.matic.ninja/api/files/49058df9-983e-43b6-8755-84b92c272357",
 * 					"owner": "https://api-sandbox.cappacity.matic.ninja/api/users/xxx%40example.com"
 * 				}
 * 			}
 * 		}
 */
exports.get = {
  path: '/',
  middleware: [ 'auth' ],
  handlers: {
    '1.0.0': function completeResumableUpload(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { filename } = body.params;
          const message = { filename, username: req.user.id };

          return req.amqp.publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
        })
        .then(fileData => {
          res.send(config.models.File.transform(fileData, true));
        })
        .asCallback(next);
    },
  },
};
