const validator = require('../validator.js');
const config = require('../config.js');
const map = require('lodash/map');

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
 *     "Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Body) {Object} data                                           data container
 * @apiParam (Body) {String="upload"} data.type                             data type, must be "upload"
 * @apiParam (Body) {Object} data.attributes                                data attributes container
 * @apiParam (Body) {Object} data.attributes.meta                           custom name of the file
 * @apiParam (Body) {String} data.attributes.meta.name                      custom name of the file
 * @apiParam (Body) {String} [data.attributes.meta.description]             file description
 * @apiParam (Body) {String} [data.attributes.meta.website]                 some link for a given file
 * @apiParam (Body) {String[]} [data.attributes.meta.tags]                  tags for a given model
 * @apiParam (Body) {Number[]} [data.attributes.meta.controlsData]          camera position for the model
 * @apiParam (Body) {Boolean} [data.attributes.meta.fitToSquare]            how to display preview
 * @apiParam (Body) {Object} [data.attributes.access]                       access data container
 * @apiParam (Body) {Boolean} [data.attributes.access.setPublic]            if set to `true` will make model public on upload
 * @apiParam (Body) {Object[]} data.attributes.files                        array of file objects
 * @apiParam (Body) {Number} data.attributes.files.contentLength            size of file in bytes
 * @apiParam (Body) {String="c-bin","с-texture","c-preview"}                data.attributes.files.type type
 * @apiParam (Body) {String} data.attributes.files.decompressedLength       file size
 * @apiParam (Body) {String="application/octet-stream","image/jpeg"}        data.attributes.files.contentType file content type
 * @apiParam (Body) {String="gzip"} [data.attributes.files.contentEncoding] encoding of the file
 * @apiParam (Body) {String} data.attributes.files.md5Hash                  checksum
 * @apiParam (Body) {Object} [data.attributes.postAction]                   container for post-upload actions
 * @apiParam (Body) {Object} [data.attributes.postAction.update]            container for post-upload update action
 * @apiParam (Body) {Object} [data.attributes.postAction.update.alias]      set alias for this file after upload has been completed
 *
 * @apiExample {curl} Example usage:
 *   curl -X POST -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox-dev.matic.ninja/api/files" -d '{
 *       "data": {
 *         "type": "upload",
 *         "attributes": {
 *           "meta": {
 *             "name": "banana model",
 *             "description": "the best banana in the world",
 *             "website": "https://banana.com"
 *           },
 *           "access": {
 *             "setPublic": true
 *           },
 *           "files": [
 *             {
 *               "type": "c-bin",
 *               "contentLength": 12317289,
 *               "contentType": "application/octet-stream",
 *               "md5Hash": "c8837b23ff8aaa8a2dde915473ce0991"
 *             },
 *             {
 *               "type": "c-texture",
 *               "contentLength": 13123,
 *               "contentType": "image/jpeg",
 *               "md5Hash": "dcf62199cada2bc7f3d58199d5c52283"
 *             },
 *             {
 *               "type": "c-preview",
 *               "contentLength": 2174189,
 *               "contentType": "image/jpeg",
 *               "md5Hash": "b667d77d36ebcdc33a6c87e09897b589"
 *             },
 *             {
 *               "type": "c-archive",
 *               "contentLength": 19917289,
 *               "contentType": "application/cappasity-archive",
 *               "md5Hash": "dcf62199c12345c7f3d58199d5c52283"
 *             }
 *           ]
 *         }
 *       }
 *     }'
 *
 * @apiUse ValidationError
 * @apiUse ForbiddenResponse
 *
 * @apiSuccess (Code 201) {Object} meta                           meta container
 * @apiSuccess (Code 201) {String} meta.id                        request id
 * @apiSuccess (Code 201) {Object} data                           data container
 * @apiSuccess (Code 201) {String} data.type                      "upload"
 * @apiSuccess (Code 201) {String} data.id                        upload id
 * @apiSuccess (Code 201) {Object} data.links                     links container
 * @apiSuccess (Code 201) {String} data.links.self                resource link
 *
 * @apiSuccessExample {json} Success-Upload:
 *     HTTP/1.1 201 OK
 *     {
 *       "meta": {
 *         "id": "request-id",
 *       },
 *       "data": {
 *         "type": "upload",
 *         "id": "fdce4a1c-a094-41e3-98b1-2e92cc1a7c27",
 *         "attributes": {
 *           "uploadId": "",
 *           // some metadata
 *           "files": [
 *             // array of object with filenames
 *           ]
 *         },
 *         "links": [
 *           "https://www.googleapis.com/upload/storage/v1/b/myBucket/o?uploadType=resumable&upload_id=dasjka0aA_1231287",
 *           "https://www.googleapis.com/upload/storage/v1/b/myBucket/o?uploadType=resumable&upload_id=dasjka0aA_1231287",
 *           "https://www.googleapis.com/upload/storage/v1/b/myBucket/o?uploadType=resumable&upload_id=dasjka0aA_1231287",
 *           "https://www.googleapis.com/upload/storage/v1/b/myBucket/o?uploadType=resumable&upload_id=dasjka0aA_1231287"
 *         ]
 *       }
 *     }
 */
exports.post = {
  path: '/',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function initResumableUpload(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then((body) => {
          const { amqp, user } = req;
          const { origin } = req.headers;
          const attributes = body.data.attributes;
          const username = user.id;
          const message = {
            ...attributes,
            username,
            origin,
          };

          // alter meta tags
          const meta = message.meta;
          if (meta.tags) {
            meta.tags = meta.tags.map(tag => tag.toLowerCase().trim());
          }

          return amqp
            .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
        })
        .then((result) => {
          res.send(201, {
            type: 'upload',
            id: result.uploadId,
            attributes: result,
            links: map(result.files, 'location'),
          });

          return false;
        })
        .asCallback(next);
    },
  },
};
