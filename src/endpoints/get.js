const { HttpStatusError } = require('common-errors');
const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'get';

/**
 * @api {get} /public/:alias/:filename returns public information about specific file
 * @apiVersion 1.0.0
 * @apiName GetPublicInfo
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns public information about a specific file
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 * 		"Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Params) {String} filename      name of the file
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox.matic.ninja/api/files/49058df9-983e-43b6-8755-84b92c272357"
 *
 * @apiUse FileNotFoundError
 *
 * @apiSuccess (Code 200) {Object} meta                           meta container
 * @apiSuccess (COde 200) {String} meta.id                        request id
 * @apiSuccess (Code 200) {Object} data                           data container
 * @apiSuccess (Code 200) {String} data.type                      "file"
 * @apiSuccess (Code 200) {String} data.id                        file id
 * @apiSuccess (Code 200) {Object} data.attributes                attributes container
 * @apiSuccess (Code 200) {String} data.attributes.humanName      custom name of the file
 * @apiSuccess (Code 200) {String} data.attributes.contentType    content type of the file
 * @apiSuccess (Code 200) {Number} data.attributes.contentLength  size in bytes
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
 * 				"id": "098f6bcd4621d373cade4e832627b4f6/49058df9-983e-43b6-8755-84b92c272357",
 * 				"attributes": {
 * 				  "humanName": "my extremely interesting model",
 * 					"contentType": "application/cappasity-3d",
 * 					"contentLength": 132718274182,
 * 					"md5Hash": "52dd9e7bbdef6ac7d345888c17fa5848",
 * 					"owner": "xxx@example.com"
 * 				},
 * 				"links": {
 * 					"self": "https://api-sandbox.matic.ninja/api/files/098f6bcd4621d373cade4e832627b4f6%2F49058df9-983e-43b6-8755-84b92c272357",
 * 					"owner": "https://api-sandbox.matic.ninja/api/users/bond"
 * 				}
 * 			}
 * 		}
 */
exports.get = {
  path: '/public/:alias/:filename',
  handlers: {
    '1.0.0': function getFileInformation(req, res, next) {
      const { alias, filename } = req.params;

      const message = { filename, alias };

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .catch({ code: 403 }, () => {
          throw new HttpStatusError(404, 'could not find associated data');
        })
        .then(fileData => {
          if (!fileData.public) {
            throw new HttpStatusError(404, 'could not find associated data');
          }

          res.send(config.models.File.transform(fileData, true, true));
          return false;
        })
        .asCallback(next);
    },
  },
};
