const validator = require('../validator.js');
const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'access';

/**
 * @api {put} /access Changes access to a given file
 * @apiVersion 1.0.0
 * @apiName ChangeAccess
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription When status is set to public - this file becomes searchable, and accessible through a direct link on cloud storage
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 *     "Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiParam (Body) {Object} data             data container
 * @apiParam (Body) {String="file"} data.type data type, must be "file"
 * @apiParam (Body) {String} data.id          file id
 * @apiParam (Body) {Object} data.attributes  attributes container
 * @apiParam (Body) {Boolean} data.attributes.public when set to `false` makes file Private, `true` - makes it public
 *
 * @apiExample {curl} Example usage:
 *   curl -X PUT -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox-dev.matic.ninja/api/files/access" -d '{
 *       "data": {
 *         "type": "file",
 *         "id": "3c69b6f9-02db-4057-8b36-91c19e6ee43f",
 *         "attributes": {
 *            "public": true
 *         }
 *       }
 *     }'
 *
 * @apiUse ValidationError
 * @apiUse UnauthorizedError
 * @apiUse FileNotFoundError
 * @apiUse ForbiddenResponse
 *
 * @apiSuccessExample {json} Success-Finish:
 *     HTTP/1.1 204 No Content
 */
exports.put = {
  path: '/access',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function adjustAccess(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          const { data: { id, attributes: { public: setPublic } } } = body;
          const message = {
            filename: id,
            setPublic,
            username: req.user.id,
          };

          return req
            .amqp
            .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) });
        })
        .then(() => {
          res.send(204);
          return false;
        })
        .asCallback(next);
    },
  },
};
