const config = require('../config.js');
const get = require('lodash/get');
const { HttpStatusError } = require('common-errors');

const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'info';

/**
 * @api {get} /info/:alias/:filename returns information about specific file
 * @apiVersion 1.0.0
 * @apiName GetInfo
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns information about specific file that belongs to a user.
 * When status is `processed` - it can be downloaded. Filename includes username
 * prefix when attached to an owner. Make sure that when you insert :filename, it's processed by `encodeURIComponent`
 *
 * @apiParam (Params) {String} filename      name of the file
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept: application/vnd.api+json' \
 *     "https://api-sandbox-dev.matic.ninja/api/files/info/bamboo/49058df9-983e-43b6-8755-84b92c272357"
 *
 * @apiUse FileNotFoundError
 *
 * @apiSuccess (Code 200) {Object} meta                           meta container
 * @apiSuccess (COde 200) {String} meta.id                        request id
 * @apiSuccess (Code 200) {Object} data                           data container
 * @apiSuccess (Code 200) {String} data.type                      `file`
 * @apiSuccess (Code 200) {String} data.id                        bundle id
 * @apiSuccess (Code 200) {Object} data.attributes                attributes container
 * @apiSuccess (Code 200) {String} data.attributes.name           custom name of the file
 * @apiSuccess (Code 200) {String} data.attributes.description    file description
 * @apiSuccess (Code 200) {String} data.attributes.website        some link for a given file
 * @apiSuccess (Code 200) {Number} data.attributes.startedAt      when file upload was started
 * @apiSuccess (Code 200) {Number} data.attributes.uploadedAt     when file upload was started
 * @apiSuccess (Code 200) {String} data.attributes.status         status of the file, `pending`, `uploaded` or `processed`
 * @apiSuccess (Code 200) {String} data.attributes.owner          owner of the file - either email or alias
 * @apiSuccess (Code 200) {Number} data.attributes.contentLength  size of complete bundle in bytes
 * @apiSuccess (Code 200) {String} [data.attributes.public]       this field will be present if file is public
 * @apiSuccess (Code 200) {String} [data.attributes.error]        if error happened during processing - code will be here
 * @apiSuccess (Code 200) {Object[]} data.attributes.files        information about bundled files
 * @apiSuccess (Code 200) {String} data.attributes.files.filename filename
 * @apiSuccess (Code 200) {String} data.attributes.files.type     type
 * @apiSuccess (Code 200) {String} data.attributes.files.contentLength file size
 * @apiSuccess (Code 200) {String} data.attributes.files.contentType file content type
 * @apiSuccess (Code 200) {String} [data.attributes.files.contentEncoding] encoding of the file
 * @apiSuccess (Code 200) {String} data.attributes.files.md5Hash  checksum
 * @apiSuccess (Code 200) {Object} data.links                     links container
 * @apiSuccess (Code 200) {String} data.links.self                resource link
 * @apiSuccess (Code 200) {String} data.links.owner               link to the owner of the file
 *
 * @apiSuccessExample {json} Success-Finish:
 *     HTTP/1.1 200 OK
 *     {
 *       "meta": {
 *         "id": "request-id"
 *       },
 *       "data": {
 *         "type": "file",
 *         "id": "49058df9-983e-43b6-8755-84b92c272357",
 *         "attributes": {
 *           "name": "Bamboo the tree",
 *           "startedAt": 1448363306185,
 *           "uploadedAt": 1448363306185,
 *           "status": "uploaded",
 *           "contentLength": 132718274182,
 *           "owner": "bamboo",
 *           "public": "1",
 *           "preview": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/6f91c1f3-4c17-43b6-9f50-26a08df56f3d.jpg",
 *           "model": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/88467680-d86d-4ea2-8c07-c9bd984736b1.bin.gz",
 *           "texture_1": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/fdce4a1c-a094-41e3-98b1-2e92cc1a7c27.jpg",
 *           "texture_2": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/3c69b6f9-02db-4057-8b36-91c19e6ee43f.jpg",
 *           "files": [
 *             {
 *               "filename": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/88467680-d86d-4ea2-8c07-c9bd984736b1.bin.gz",
 *               "type": "c-bin",
 *               "contentType": "application/octet-stream",
 *               "contentEncoding": "gzip",
 *               "contentLength": 1327182741,
 *               "md5Hash": "c8837b23ff8aaa8a2dde915473ce0991"
 *             },
 *             {
 *               "filename": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/fdce4a1c-a094-41e3-98b1-2e92cc1a7c27.jpg",
 *               "type": "c-texture",
 *               "contentType": "image/jpeg",
 *               "contentLength": 412412,
 *               "md5Hash": "d8c37b23ff8aaa8a2dde915473ce0991"
 *             },
 *             {
 *               "filename": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/3c69b6f9-02db-4057-8b36-91c19e6ee43f.jpg",
 *               "type": "c-texture",
 *               "contentType": "image/jpeg",
 *               "contentLength": 432423,
 *               "md5Hash": "c8837b23ff8acd8a2dde915473ce0991"
 *             },
 *             {
 *               "filename": "202cb962ac59075b964b07152d234b70/49058df9-983e-43b6-8755-84b92c272357/6f91c1f3-4c17-43b6-9f50-26a08df56f3d.jpg",
 *               "type": "c-preview",
 *               "contentType": "image/jpeg",
 *               "contentLength": 489179,
 *               "md5Hash": "c8832b13ff8aaa8a2dde915473ce0991"
 *             }
 *           ]
 *         },
 *         "links": {
 *           "self": "https://api-sandbox.cappacity.matic.ninja/api/files/bamboo/49058df9-983e-43b6-8755-84b92c272357",
 *           "owner": "https://api-sandbox.cappacity.matic.ninja/api/users/bamboo"
 *         }
 *       }
 *     }
 */
exports.get = {
  path: '/info/:alias/:filename',
  middleware: ['conditional-auth'],
  handlers: {
    '1.0.0': function getFileInformation(req, res, next) {
      const { filename, alias } = req.params;
      const message = { filename, username: alias };
      const username = get(req, 'user.id', false);

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then((rsp) => {
          const isPrivate = username && rsp.username === username;
          const fileData = rsp.file;

          // if file is not marked as public and isPrivate === false
          if (!fileData.public && isPrivate === false) {
            throw new HttpStatusError(404, 'file not found');
          }

          res.send(config.models.File.transform(fileData, true, !isPrivate));
          return false;
        })
        .asCallback(next);
    },
  },
};
