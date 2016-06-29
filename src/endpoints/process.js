const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'process';
const validator = require('../validator.js');


/**
 * @api {post} /process Re-processes filename based on input metadata
 * @apiVersion 1.0.0
 * @apiName ProcessFile
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns 201 Accepted, poll to get results of processing
 *
 * @apiParam (Params) {String} filename
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept: application/vnd.api+json' \
 *   	 -X POST -d '{
 *   	   "data": {
 *   	   	 "type": "file",
 *   	   	 "id": "9058df9-983e-43b6-8755-84b92c272357",
 *   	   	 "attributes": {
 *   	   	   "export": {
 *   	   	     "type": "wrl",
 *   	   	     "meta": {
 *   	   	       // some extra flags / meta
 *   	   	     }
 *   	   	   }
 *   	   	 }
 *   	   }
 *   	 }' \
 *     "https://api-sandbox-dev.matic.ninja/api/files/process"
 *
 * @apiUse FileNotFoundError
 * @apiUse PreconditionFailedError
 *
 * @apiSuccessExample {json} Success-Download:
 *     HTTP/1.1 201 Accepted
 */
exports.get = {
  path: '/process',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      return validator
        .validate(ROUTE_NAME, req.body)
        .then(body => {
          // basic message
          const message = {
            uploadId: body.data.id,
            username: req.user.id,
            export: body.data.attributes.body.export
          };

          return req.amqp
            .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
            .then(() => {
              res.send(201);
              return false;
            });
        })
        .asCallback(next);
    },
  },
};
