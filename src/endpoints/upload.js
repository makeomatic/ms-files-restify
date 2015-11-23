const Errors = require('common-errors');
const validator = require('../validator.js');
const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'upload';

/**
 * @api {post} / Initiates new file upload
 * @apiVersion 1.0.0
 * @apiName UploadFile
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription Initializes file upload, creating a resumable session id, which will be valid for a couple of hours and can be used
 * to upload a file directly to storage provider
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 * 		"Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Body) {Object} data                                 data container
 * @apiParam (Body) {String="file"} data.type                     data type, must be "file"
 * @apiParam (Body) {Object} data.attributes                      data attributes container
 * @apiParam (Body) {String} data.attributes.md5Hash              md5 checksum of the file to be uploaded
 * @apiParam (Body) {String} data.attributes.contentType          content-type of the file to be uploaded
 * @apiParam (Body) {String} data.attributes.contentLength        content-length of the file to be uploaded
 * @apiParam (Body) {String} [data.attributes.contentEncodning]   optional content-encoding, for instance "gzip"
 *
 * @apiExample {curl} Example usage:
 *   curl -X POST -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox.cappacity.matic.ninja/api/files" -d '{
 *       "data": {
 *         "type": "file",
 *         "attributes": {
 *           "md5Hash": "52dd9e7bbdef6ac7d345888c17fa5848",
 *           "contentType": "application/cappasity-model",
 *           "contentEncoding": "gzip",
 *           "contentLength": 124612827
 *         }
 *       }
 *     }' | gunzip
 *
 * @apiUse UserAuthResponse
 * @apiUse ValidationError
 * @apiUse PaymentRequiredError
 *
 * @apiSuccess (Code 201) {Object} meta                           meta container
 * @apiSuccess (COde 201) {String} meta.id                        request id
 * @apiSuccess (Code 201) {Object} data                           data container
 * @apiSuccess (Code 201) {String} data.type                      "upload"
 * @apiSuccess (Code 201) {String} data.id                        upload id
 * @apiSuccess (Code 201) {Object} data.links                     links container
 * @apiSuccess (Code 201) {String} data.links.self                resource link
 *
 * @apiSuccessExample {json} Success-Upload:
 * 		HTTP/1.1 201 OK
 * 		{
 * 			"meta": {
 * 				"id": "request-id",
 * 			},
 * 			"data": {
 * 				"type": "upload",
 * 				"id": "dasjka0aA_1231287",
 * 				"links": {
 * 					"self": "https://www.googleapis.com/upload/storage/v1/b/myBucket/o?uploadType=resumable&upload_id=dasjka0aA_1231287"
 * 				}
 * 			}
 * 		}
 */
exports.post = {
  path: '/',
  middleware: [ 'auth' ],
  handlers: {
    '1.0.0': function initResumableUpload(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { amqp, user } = req;
          const attributes = body.data.attributes;
          const usersConfig = config.users;
          const { audience } = usersConfig;
          const metadataRoute = [ usersConfig.prefix, usersConfig.postfix.updateMetadata ].join('.');
          const username = user.id;
          const message = Object.assign({ id: username }, attributes);

          if (user.attributes.models < 1) {
            throw new Errors.HttpStatusError(402, 'no more models are available');
          }

          return amqp.publishAndWait(metadataRoute, {
            username,
            audience,
            metadata: {
              $incr: {
                models: -1,
              },
            },
          }, { timeout: 5000 })
          .then(result => {
            if (result.$incr.models < 0) {
              throw new Errors.HttpStatusError(402, 'no more models are available');
            }

            return req.amqp.publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
          })
          .catch({ code: 402 }, function refundBackToZero(err) {
            return amqp
              .publishAndWait(metadataRoute, { username, audience, metadata: { $incr: { models: 1 } } }, { timeout: 10000 })
              .throw(err);
          });
        })
        .then(result => {
          res.send(201, {
            type: 'upload',
            id: result.uploadId,
            links: {
              self: result.location,
            },
          });
        })
        .asCallback(next);
    },
  },
};
