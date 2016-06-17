/**
 * more docs available: https://cloud.google.com/storage/docs/object-change-notification#_Type_Sync
 */
const Promise = require('bluebird');
const Errors = require('common-errors');
const config = require('../config.js');
const url = require('url');
const find = require('lodash/find');

/**
 * Event examples:
 *
 * sync
 *
 * POST /ApplicationUrlPath
 * Content-Type: application/json; charset="utf-8"
 * Content-Length: 0
 * Host: ApplicationUrlHost
 * X-Goog-Channel-Id: ChannelId
 * X-Goog-Channel-Token: ClientToken
 * X-Goog-Resource-Id: ResourceId
 * X-Goog-Resource-State: sync
 * X-Goog-Resource-Uri: https://www.googleapis.com/storage/v1/b/BucketName/o?alt=json
 *
 * exists
 * not_exists
 *
 * POST /ApplicationUrlPath
 * Content-Length: 1097
 * Content-Type: application/json; charset="utf-8"
 * Host: ApplicationUrlHost
 * X-Goog-Channel-Id: ChannelId
 * X-Goog-Channel-Token: ClientToken
 * X-Goog-Resource-Id: ResourceId
 * X-Goog-Resource-State: ResourceState
 * X-Goog-Resource-Uri: https://www.googleapis.com/storage/v1/b/BucketName/o?alt=json
 *
 * {
 *  "kind": "storage#object",
 *  "id": "BucketName/ObjectName",
 *  "selfLink": "https://www.googleapis.com/storage/v1/b/BucketName/o/ObjectName",
 *  "name": "ObjectName",
 *  "bucket": "BucketName",
 *  "generation": "1367014943964000",
 *  "metageneration": "1",
 *  "contentType": "binary/octet-stream",
 *  "updated": "2013-04-26T22:22:23.832Z",
 *  "size": "10",
 *  "md5Hash": "xHZY0QLVuYng2gnOQD90Yw==",
 *  "mediaLink": "https://www.googleapis.com/storage/v1/b/BucketName/o/ObjectName?generation=1367014943964000&alt=media",
 *  "owner": {
 *   "entity": "user-007b2a38086590de0a47c786e54b1d0a21c02d062fcf3ebbaf9b63edb9c8db0c",
 *   "entityId": "007b2a38086590de0a47c786e54b1d0a21c02d062fcf3ebbaf9b63edb9c8db0c"
 *  },
 *  "crc32c": "C7+82w==",
 *  "etag": "COD2jMGv6bYCEAE="
 * }
 */

module.exports = function gceWebhook(req, res, next) {
  const headers = req.headers;
  const $gce = config.files.gce;
  const gce = Array.isArray($gce) ? _gce : [$gce];

  // input
  const channel = headers['x-goog-channel-id'];
  const action = headers['x-goog-resource-state'];
  const resourceId = headers['x-goog-resource-id'];
  const resourceUri = headers['x-goog-resource-uri'];
  const token = headers['x-goog-channel-token'];

  // verify
  return Promise.try(() => {
    // these are headers
    const parsedUrl = url.parse(resourceUri);
    const bucket = parsedUrl.pathname.split('/')[4];
    const matchingConfiguration = find(gce, { channel, token, bucket });

    if (!matchingConfiguration) {
      throw new Errors.HttpStatusError(403, 'webhook configuration mismatch');
    }

    if (action === 'sync') {
      res.send(200);
      return false;
    }

    // add/delete notifications
    req.file = {
      action,
      resourceId,
      filename: req.body.name,
    };
    return null;
  })
  .asCallback(next);
};
