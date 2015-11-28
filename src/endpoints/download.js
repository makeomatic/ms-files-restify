const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'download';

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
 * 		Location: https://storage.googleapis.com/bucket-name/username/49058df9-983e-43b6-8755-84b92c272357?GoogleAccessId=xxx&expires=231283612781232&signature=xxx
 */
exports.get = {
  path: '/download/:filename',
  middleware: [ 'auth' ],
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      const { filename } = req.params;
      const message = {
        filename: decodeURIComponent(filename),
        username: req.user.id,
      };

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then(signedURL => {
          res.setHeader('Location', signedURL);
          res.send(302);
        })
        .asCallback(next);
    },
  },
};
