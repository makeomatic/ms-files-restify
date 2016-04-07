const Promise = require('bluebird');
const Errors = require('common-errors');
const config = require('../config.js');
const validator = require('../validator.js');
const ld = require('lodash').runInContext();
const { stringify: qs } = require('querystring');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'list';

// adds all mixins
ld.mixin(require('mm-lodash'));

/**
 * @api {get} / returns list of uploaded files
 * @apiVersion 1.0.0
 * @apiName GetFilesList
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns list of files
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox-dev.matic.ninja/api/files"
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
 *                                                   `#multi` - specify `fields` and value to search in `OR` fashion
 * @apiParam (Query) {String} [sortBy]              `encodeURIComponent(sortBy)`, if not specified, sorts by
 *                                                   createdAt, otherwise by metadata field passed here
 * @apiParam (Query) {String="ASC","DESC"} [order]  sorting order, defaults to "ASC", case-insensitive
 * @apiParam (Query) {String} [tags]                `encodeURIComponent(JSON.stringify(tags))`,
                                                    tags that should be contained in files
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
 * @apiSuccess (Code 200) {String}   data.attributes.name           custom name of the file
 * @apiSuccess (Code 200) {String}   data.attributes.description    file description
 * @apiSuccess (Code 200) {String}   data.attributes.website        some link for a given file
 * @apiSuccess (Code 200) {Number}   data.attributes.startedAt      when file upload was started
 * @apiSuccess (Code 200) {Number}   data.attributes.uploadedAt     when file upload was started
 * @apiSuccess (Code 200) {String}   data.attributes.status         status of the file, `pending`, `uploaded` or `processed`
 * @apiSuccess (Code 200) {String}   data.attributes.owner          owner of the file - either email or alias
 * @apiSuccess (Code 200) {Number}   data.attributes.contentLength  size of complete bundle in bytes
 * @apiSuccess (Code 200) {String}   [data.attributes.public]       this field will be present if file is public
 * @apiSuccess (Code 200) {String}   [data.attributes.error]        if error happened during processing - code will be here
 * @apiSuccess (Code 200) {Object[]} data.attributes.files          information about bundled files
 * @apiSuccess (Code 200) {String}   data.attributes.files.filename filename
 * @apiSuccess (Code 200) {String}   data.attributes.files.type     type
 * @apiSuccess (Code 200) {String}   data.attributes.files.contentLength file size
 * @apiSuccess (Code 200) {String}   data.attributes.files.contentType file content type
 * @apiSuccess (Code 200) {String}   [data.attributes.files.contentEncoding] encoding of the file
 * @apiSuccess (Code 200) {String}   data.attributes.files.md5Hash  checksum
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
 *           "self": "https://api-sandbox-dev.matic.ninja/api/files/bamboo/49058df9-983e-43b6-8755-84b92c272357",
 *           "owner": "https://api-sandbox-dev.matic.ninja/api/users/bamboo"
 *         }
 *       }],
 *       "links": {
 *         "self": "https://api-sandbox-dev.matic.ninja/api/files?offset=0&limit=10&order=DESC",
 *         "next": "https://api-sandbox-dev.matic.ninja/api/files?offset=11&limit=10&order=DESC"
 *       }
 *     }
 */
exports.get = {
  path: '/',
  middleware: ['conditional-auth'],
  handlers: {
    '1.0.0': function listFiles(req, res, next) {
      const user = req.user || false;
      const isAdmin = user && user.isAdmin();
      const alias = user && user.attributes.alias;
      const id = user && user.id;
      const qOwner = req.query.owner;
      const qPub = req.query.pub;

      let isPublic;
      let owner;
      if (!user) {
        isPublic = true;
        owner = qOwner || undefined;
      } else if (isAdmin || (alias && qOwner === alias) || qOwner === id) {
        // define public or not
        isPublic = qPub ? Boolean(+qPub) : undefined;
        // define whether filter by owner or not
        owner = qOwner || undefined;
      } else if (!qOwner && !alias) {
        isPublic = qPub ? Boolean(+qPub) : undefined;
        owner = id;
      } else {
        isPublic = true;
        owner = qOwner || alias;
      }

      return Promise
      .try(function completeFilter() {
        const { query: { order, filter, offset, limit, sortBy, tags } } = req;
        const parsedFilter = filter && JSON.parse(decodeURIComponent(filter)) || undefined;
        const parsedTags = tags && JSON.parse(decodeURIComponent(tags)) || undefined;
        return ld.compactObject({
          order: (order || 'DESC').toUpperCase(),
          owner,
          offset: offset && +offset || undefined,
          limit: limit && +limit || 10,
          filter: parsedFilter || {},
          criteria: sortBy || undefined,
          public: isPublic,
          tags: parsedTags,
        });
      })
      .catch(function validationError(err) {
        req.log.error('input error', err);
        throw new Errors.ValidationError('query.filter and query.sortBy must be uri encoded, ' +
          'query.filter must be a valid JSON object and query.tags must be a valid JSON array', 400);
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
        const { order, filter, offset, limit, criteria: sortBy, tags } = message;
        const selfQS = {
          order,
          limit,
          offset: offset || 0,
          sortBy,
          filter: encodeURIComponent(JSON.stringify(filter)),
          pub: Number(isPublic),
          owner,
          tags: encodeURIComponent(JSON.stringify(tags)),
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
          return File.transform(fileData, true, isPublic);
        }));
      })
      .asCallback(next);
    },
  },
};
