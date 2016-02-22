const Promise = require('bluebird');
const Errors = require('common-errors');
const config = require('../config.js');
const validator = require('../validator.js');
const ld = require('lodash').runInContext();
const { stringify: qs } = require('querystring');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'list';
const hasOwnProperty = Object.prototype.hasOwnProperty;

// adds all mixins
ld.mixin(require('mm-lodash'));

/**
 * @api {get} / returns list of uploaded files
 * @apiVersion 1.0.0
 * @apiName GetFilesList
 * @apiGroup Files
 * @apiPermission user
 *
 * @apiDescription Returns list of files
 *
 * @apiHeader (Authorization) {String} Authorization JWT :accessToken
 * @apiHeaderExample Authorization-Example:
 *     "Authorization: JWT myreallyniceandvalidjsonwebtoken"
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox.cappacity.matic.ninja/api/files" | gunzip
 *
 * @apiUse ForbiddenResponse
 * @apiUse UnauthorizedError
 * @apiUse FileNotFoundError
 * @apiUse ValidationError
 *
 * @apiParam (Query) {Number{0..}} [offset]         how many files to skip
 * @apiParam (Query) {Number{1..100}} [limit]       how many files to return per page
 * @apiParam (Query) {String} [filter]              `encodeURIComponent(JSON.stringify(filterObject))`, pass it as value.
 *                                                   `#` - filters by filename, other keys - by allowed metadata
 * @apiParam (Query) {String} [sortBy]              `encodeURIComponent(sortBy)`, if not specified, sorts by
 *                                                   createdAt, otherwise by metadata field passed here
 * @apiParam (Query) {String="ASC","DESC"} [order]  sorting order, defaults to "ASC", case-insensitive
 *
 * @apiSuccess (Code 200) {Object}   meta                           response meta information
 * @apiSuccess (Code 200) {String}   meta.id                        request id
 * @apiSuccess (Code 200) {Number}   meta.page                      current page we are looking at
 * @apiSuccess (Code 200) {Number}   meta.pages                     total number of pages
 * @apiSuccess (Code 200) {Number}   meta.cursor                    set as offset for the next page
 * @apiSuccess (Code 200) {Object[]} data                           response data
 * @apiSuccess (Code 200) {String}   data.type                      response data type - always `file`
 * @apiSuccess (Code 200) {String}   data.id                        filename, uuid.v4()
 * @apiSuccess (Code 200) {Object}   data.attributes                file attributes
 * @apiSuccess (Code 200) {Number}   data.attributes.startedAt      file creation time
 * @apiSuccess (Code 200) {String}   data.attributes.status         current status of the file: pending, uploaded, processed
 * @apiSuccess (Code 200) {String}   data.attributes.contentType    file's content type
 * @apiSuccess (Code 200) {Number}   data.attributes.contentLenght  number of bytes in the file
 * @apiSuccess (Code 200) {String}   data.attributes.md5Hash        file's checksum
 * @apiSuccess (Code 200) {String}   data.attributes.owner          file's owner
 * @apiSuccess (Code 200) {Object}   data.links                     file links
 * @apiSuccess (Code 200) {String}   data.links.self                link to the current resource
 * @apiSuccess (Code 200) {String}   data.links.owner               link to the owner of the resource, optionally present
 * @apiSuccess (Code 200) {String}   links                          links
 * @apiSuccess (Code 200) {String}   links.self                     link to the current page
 * @apiSuccess (Code 200) {String}   links.next                     link to the next page
 *
 * @apiSuccessExample {json} Success-Finish:
 *     HTTP/1.1 200 OK
 *     {
 *       "meta": {
 *         "id": "request-id",
 *         "page": 3,
 *         "pages": 3,
 *         "cursor": 31
 *       },
 *       "data": [{
 *         "type": "file",
 *         "id": "49058df9-983e-43b6-8755-84b92c272357",
 *         "attributes": {
 *           "startedAt": "1448363306185",
 *           "status": "pending",
 *           "contentType": "application/cappasity-3d",
 *           "contentLength": 132718274182,
 *           "md5Hash": "52dd9e7bbdef6ac7d345888c17fa5848",
 *           "owner": "xxx@example.com"
 *         },
 *         "links": {
 *           "self": "https://api-sandbox.cappacity.matic.ninja/api/files/49058df9-983e-43b6-8755-84b92c272357",
 *           "owner": "https://api-sandbox.cappacity.matic.ninja/api/users/xxx%40example.com"
 *         }
 *       }],
 *       "links": {
 *         "self": "https://api-sandbox.cappacity.matic.ninja/api/files?offset=0&limit=10&order=DESC",
 *         "next": "https://api-sandbox.cappacity.matic.ninja/api/files?offset=11&limit=10&order=DESC"
 *       }
 *     }
 */
exports.get = {
  path: '/',
  middleware: ['auth'],
  handlers: {
    '1.0.0': function listFiles(req, res, next) {
      // admin can choose, use forced to public
      const isPublic = req.user.isAdmin() ? hasOwnProperty.call(req.query, 'pub') : false;

      // this is now something everyone can use
      const owner = hasOwnProperty.call(req.query, 'owner') ? req.query.owner : null;

      return Promise
      .try(function completeFilter() {
        const { order, filter, offset, limit, sortBy } = req.query;
        const parsedFilter = filter && JSON.parse(decodeURIComponent(filter)) || undefined;
        return ld.compactObject({
          order: (order || 'DESC').toUpperCase(),
          offset: offset && +offset || undefined,
          limit: limit && +limit || 10,
          filter: parsedFilter || {},
          criteria: sortBy && decodeURIComponent(sortBy) || undefined,
          public: isPublic,
          owner,
        });
      })
      .catch(function validationError(err) {
        req.log.error('input error', err);
        throw new Errors.ValidationError('query.filter and query.sortBy must be uri encoded, and query.filter must be a valid JSON object', 400);
      })
      .then(function validateMessage(message) {
        return validator.validate(ROUTE_NAME, message);
      })
      .then(function askAMQP(message) {
        return Promise.join(
          req.amqp.publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) }),
          message
        );
      })
      .spread(function listResponse(answer, message) {
        const { page, pages, cursor } = answer;
        const { order, filter, offset, limit, criteria: sortBy } = message;
        const selfQS = {
          order,
          limit,
          offset: offset || 0,
          sortBy,
          filter: encodeURIComponent(JSON.stringify(filter)),
        };

        res.meta = { page, pages };

        const base = config.host + config.files.attachPoint;
        res.links = {
          self: `${base}?${qs(selfQS)}`,
        };

        if (page < pages) {
          const nextQS = { ...selfQS, offset: cursor };
          res.meta.cursor = cursor;
          res.links.next = `${base}?${qs(nextQS)}`;
        }

        const { File } = config.models;
        res.send(answer.files.map(function transformFile(fileData) {
          return File.transform(fileData, true);
        }));
      })
      .asCallback(next);
    },
  },
};
