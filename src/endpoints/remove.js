const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'remove';

/**
 * @api {delete} /:filename Remove file
 * @apiVersion 1.0.0
 * @apiName RemoveFile
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription removes given upload
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 *     "Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Params) {String} filename   id of file group to be removed
 *
 * @apiExample {curl} Example usage:
 *   curl -X DELETE -H 'Accept: application/vnd.api+json' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox-dev.matic.ninja/api/files/3c69b6f9-02db-4057-8b36-91c19e6ee43f"
 *
 * @apiUse ValidationError
 * @apiUse UnauthorizedError
 * @apiUse FileNotFoundError
 * @apiUse ForbiddenResponse
 *
 * @apiSuccessExample {json} Success-Finish:
 *     HTTP/1.1 200 OK
 */
exports.del = {
  path: '/:filename',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function removeFile(req, res, next) {
      const message = { filename: req.params.filename };

      const username = req.user.isAdmin() ? undefined : req.user.id;
      if (username) {
        message.username = username;
      }

      return req
        .amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then(() => {
          res.send(200);
          return false;
        })
        .asCallback(next);
    },
  },
};
