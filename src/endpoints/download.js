const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'download';
const base64 = require('urlsafe-base64');

/**
 * @api {get} /download/:filename Download provided file
 * @apiVersion 1.0.0
 * @apiName DownloadFile
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription Returns signed URL that can be used to download file. Make sure that when you insert :filename, it's processed by `encodeURIComponent`
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 * 		"Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Params) {String} filename
 *
 * @apiExample {curl} Example usage:
 *   curl -i -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox.cappacity.matic.ninja/api/files/download/v%40example.com%2F49058df9-983e-43b6-8755-84b92c272357"
 *
 * @apiUse ValidationError
 * @apiUse ForbiddenResponse
 * @apiUse UnauthorizedError
 * @apiUse FileNotFoundError
 * @apiUse PreconditionFailedError
 *
 * @apiSuccessExample {json} Success-Download:
 * 		HTTP/1.1 302 Moved Temporarily
 * 		X-Content-Preview: 4-xxxx
 * 		X-Content: yyyy-zzzz
 * 		X-Content-MD5: base64(md5Hash)
 * 		Location: https://storage.googleapis.com/bucket-name/username/49058df9-983e-43b6-8755-84b92c272357?GoogleAccessId=xxx&expires=231283612781232&signature=xxx
 */
exports.get = {
  path: '/download/:filename',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      const { filename } = req.params;
      const message = {
        filename: decodeURIComponent(filename),
        username: req.user.id,
      };

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then(({ url, data }) => {
          const { checksum, previewSize, modelSize } = data;

          if (previewSize && modelSize) {
            // inclusive bytes, starts on 5th byte, 0 - 1st byte, 3 - 4th byte
            // lastByte = (4 - 1) + length
            const previewLastByte = 3 + parseInt(previewSize, 10);
            // start right after preview
            const modelStart = previewLastByte + 1;
            // preview + length - 1
            const modelStop = modelStart + parseInt(previewSize, 10) - 1;

            res.setHeader('X-Content-Preview', `bytes=4-${previewLastByte}`);
            res.setHeader('X-Content', `bytes=${modelStart}-${modelStop}`);
          }

          if (checksum) {
            res.setHeader('X-Content-MD5', base64.encode(new Buffer(data.checksum, 'hex')));
          }

          res.setHeader('Location', url);
          res.send(302);
          return false;
        })
        .asCallback(next);
    },
  },
};
