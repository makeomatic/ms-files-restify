const validator = require('../validator.js');
const config = require('../config.js');

const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'update';

/**
 * @api {patch} /update Initiates file update
 * @apiVersion 1.0.0
 * @apiName UpdateFile
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription Updates file metadata.
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 *   "Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Body) {Object} data                                       Data container.
 * @apiParam (Body) {String} data.id                                    File id.
 * @apiParam (Body) {String="file"} data.type                           Data type, must be "file".
 * @apiParam (Body) {Object} data.attributes                            Data attributes container.
 * @apiParam (Body) {Object} data.attributes.meta                       Metadata container.
 * @apiParam (Body) {String} [data.attributes.meta.name]                Custom name of the file.
 * @apiParam (Body) {String} [data.attributes.meta.description]         File description.
 * @apiParam (Body) {String} [data.attributes.meta.website]             Some link for a given file.
 * @apiParam (Body) {String} [data.attributes.meta.type]                Type of model
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage]     Background image
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage.filename]          File name
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage.username]          File owner
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage.uploadId]          Unique ID of the file
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage.contentType]       Image type. Could be image/png or image/jpeg
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage.contentLength]     Size of the image in bytes
 * @apiParam (Body) {String} [data.attributes.meta.backgroundImage.url]               Direct link to the image
 * @apiParam (Body) {String} [data.attributes.meta.backgroundColor]     Background color. Could be in hex or rgb($r, $g, $b) formats.
 * @apiParam (Body) {String[]} [data.attributes.meta.tags]              Some tags for a given file.
 * @apiParam (Body) {Number[]} [data.attributes.meta.controlsData]      Some tags for a given file.
 *
 * @apiExample {curl} Example usage:
 *   curl -i -X PATCH
 *     -H 'Accept-Version: *'
 *     -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox-dev.matic.ninja/api/files/update" -d '{
 *       "data": {
 *         "type": "file",
 *         "id": "3c69b6f9-02db-4057-8b36-91c19e6ee43f",
 *         "attributes": {
 *           "meta": {
 *             "name": "name",
 *             "description": "description",
 *             "website": "http://website.com",
 *             "tags": ["tag1", "tag2", "tag3"],
 *             "type": "object"
 *           }
 *         }
 *       }
 *     }'
 *
 * @apiUse ValidationError
 * @apiUse UnauthorizedError
 * @apiUse FileNotFoundError
 * @apiUse ForbiddenResponse
 *
 * @apiSuccessExample {json} Success-Update:
 *  HTTP/1.1 204 No Content
 */
exports.patch = {
  path: '/update',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function updateFileInformation(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then((body) => {
          const { amqp, user } = req;
          const { data: { id: uploadId, attributes: { meta } } } = body;
          const message = { uploadId, meta };
          const username = user.id;

          if (meta.tags) {
            meta.tags = meta.tags.map(tag => tag.toLowerCase().trim());
          }

          if (username) {
            message.username = username;
          }

          return amqp.publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
        })
        .then(() => {
          res.send(204);
          return false;
        })
        .asCallback(next);
    },
  },
};
