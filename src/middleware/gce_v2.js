/**
 * more docs available: https://cloud.google.com/storage/docs/object-change-notification#_Type_Sync
 */

module.exports = function gceWebhook(req, res, next) {
  // const headers = req.headers;
  // const $gce = config.files.gce_v2;
  // const gce = Array.isArray($gce) ? $gce : [$gce];

  req.log.info({ body: req.body, headers: req.headers }, 'push notification from google cloud v2');

  return next(new Error('not implemented'));
};
