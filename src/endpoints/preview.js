const config = require('../config.js');
const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'info';
const Errors = require('common-errors');
const ir = require('image-resizer-wjordan');
const { img: Img, streams } = ir;
const { identify: Identify, resize: Resize, filter: Filter, optimize: Optimize, restify: Restify } = streams;
const pump = require('pump');

/**
 * @api {get} /preview/(:modifiers)/:filename(.:format) Get preview of a provided file
 * @apiVersion 1.0.0
 * @apiName PreviewFile
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns optimized image with provided modifiers that is supposed to be cached by CDN
 *
 * @apiParam (Params) {String} filename
 * @apiParam (Params) {String} format: png, jpeg, jpg, webp
 * @apiParam (Params) {String} modifiers:
 * 															* Supported modifiers are: *
 *                              * height:       eg. h500
 *                              * width:        eg. w200
 *                              * square:       eg. s50
 *                              * crop:         eg. cfill
 *                              * top:          eg. y12
 *                              * left:         eg. x200
 *                              * gravity:      eg. gs, gne
 *                              * filter:       eg. fsepia
 *                              * external:     eg. efacebook
 *                              * quality:      eg. q90
 *
 *
 * @apiExample {curl} Example usage:
 *   curl -i -H 'Accept-Version: *' -H 'Accept: application/vnd.api+json' -H 'Accept-Encoding: gzip, deflate' \
 *     -H "Authorization: JWT therealtokenhere" \
 *     "https://api-sandbox-dev.matic.ninja/api/files/preview/h200-w200-cfill/really-nice-path-to-image.png"
 *
 * @apiUse ValidationError
 * @apiUse FileNotFoundError
 *
 * @apiSuccessExample {json} Success-Download:
 * 		HTTP/1.1 200 OK
 * 		binarycontentofimage
 */

const modifiers = '(?:(?:[hwscyxq][1-9][0-9]*|[cgf][a-z]+)-?){1,9}';
const imagePath = '([^\\/]+)';
const format = '(\\.(?:png|jpe?g|wepb))';

exports.get = {
  // /:modifers/path/to/image.format:metadata
  path: `(${modifiers}\\/)?${imagePath}${format}?$`,
  regexp: function initPath(prefix, family, path) {
    return new RegExp(`^\\/${prefix}\\/${family}\\/preview\\/${path}`);
  },
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      const message = {
        filename: decodeURIComponent(req.params[1]),
      };

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
        .then(fileData => {
          const { previewSize } = fileData;

          if (!previewSize) {
            throw new Errors.HttpStatusError(412, 'preview was not extracted yet');
          }

          const previewLastByte = 3 + parseInt(previewSize, 10);
          const options = { start: 4, end: previewLastByte };
          const image = new Img(req, options);

          return Promise.fromNode(done => {
            pump(
              image.getFile(),
              new Identify(),
              new Resize(),
              new Filter(),
              new Optimize(),
              new Restify(req, res),
              err => err ? done(err) : done(null, false)
            );
          });
        })
        .asCallback(next);
    },
  },
};
