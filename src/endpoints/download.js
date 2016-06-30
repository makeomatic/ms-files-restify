const config = require('../config.js');
const get = require('lodash/get');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'download';

/**
 * @api {get} /download/:filename Download provided file
 * @apiVersion 1.0.0
 * @apiName DownloadFile
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns signed URL that can be used to download file. If file is public - returns direct URLs
 *
 * @apiParam (Params) {String} filename
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept: application/vnd.api+json' \
 *     "https://api-sandbox-dev.matic.ninja/api/files/download/9058df9-983e-43b6-8755-84b92c272357"
 *
 * @apiUse FileNotFoundError
 * @apiUse PreconditionFailedError
 *
 * @apiSuccessExample {json} Success-Download:
 *     HTTP/1.1 200 OK
 *     {
 *         "meta": {
 *           "id": "request-id"
 *         },
 *         "data": {
 *           "type": "download",
 *           "id": "9058df9-983e-43b6-8755-84b92c272357",
 *           "attributes": {
 *             "files": [
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
 *             ],
 *             "urls": [
 *               // corresponding URLs for files
 *             ]
 *           }
 *         }
 *     }
 */
exports.get = {
  path: '/download/:filename',
  middleware: ['conditional-auth'],
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      // basic message
      const message = { uploadId: req.params.filename };

      // if we are authenticated
      const username = get(req, 'user.id');
      if (username) {
        message.username = username;
      }

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then(({ uploadId, ...data }) => {
          res.send(200, {
            type: 'download',
            id: uploadId,
            attributes: data,
          });
          return false;
        })
        .asCallback(next);
    },
  },
};
