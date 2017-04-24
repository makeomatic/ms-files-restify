/**
 * more docs available: https://cloud.google.com/storage/docs/object-change-notification#_Type_Sync
 */
const Promise = require('bluebird');
const { HttpStatusError } = require('common-errors');
const find = require('lodash/find');
const config = require('../config.js');

// bucket configuration
const $gce = config.files.gce_v2;
const gce = Array.isArray($gce) ? $gce : [$gce];

function parseInput(req) {
  const message = req.body.message;
  const { bucket, eventType, resource } = message.attributes;
  const gceSettings = find(gce, { bucket });

  if (!gceSettings) {
    return Promise.reject(new HttpStatusError(400, 'failed to find gce bucket'));
  }

  if (gceSettings.token !== req.query.token) {
    return Promise.reject(new HttpStatusError(400, 'token mismatch'));
  }

  let action;
  switch (eventType) {
    case 'OBJECT_FINALIZE':
      action = 'exists';
      break;

    default:
      return Promise.reject(new HttpStatusError(400, 'unsupported action'));
  }

  req.file = {
    action,
    resourceId: resource,
    filename: JSON.parse(Buffer.from(message.data)).name,
  };
  return null;
}

module.exports = function gceWebhook(req, res, next) {
  return Promise
    .try(parseInput.bind(req))
    .asCallback(next);
};
