const Promise = require('bluebird');
const Errors = require('common-errors');
const ir = require('image-resizer-wjordan');
const config = require('../config.js');
const pump = require('pump');
const compact = require('lodash/compact');

const { getRoute, getTimeout } = config;
const { img: Img, streams } = ir;
const { identify: Identify, resize: Resize, filter: Filter, optimize: Optimize, restify: Restify } = streams;

// amqp route
const ROUTE_NAME = 'info';

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
const ALLOWED_FORMATS = Img.validOutputFormats;

exports.get = {
  // /:modifers/path/to/image.format:metadata
  path: `(${modifiers}\\/)?${imagePath}`,
  regexp: function initPath(prefix, family, path) {
    // prefix starts with /
    return new RegExp(`^\\${prefix}\\/${family}\\/preview\\/${path}$`);
  },
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      let filename = req.params[1];
      const mod = req.params[0];
      const parts = filename.split('.');
      let format = parts.pop();

      if (ALLOWED_FORMATS.indexOf(format) >= 0) {
        filename = parts.join('.');
      } else {
        format = false;
      }

      // if it crashes, we are still wrapped in a catcher
      filename = decodeURIComponent(filename);

      const path = compact([mod, filename]).join('/');

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), { filename }, { timeout: getTimeout(ROUTE_NAME) })
        .then(fileData => {
          const { previewSize } = fileData;

          if (!previewSize) {
            throw new Errors.HttpStatusError(412, 'preview was not extracted yet');
          }

          const previewLastByte = 3 + parseInt(previewSize, 10);
          const options = { start: 4, end: previewLastByte };
          const image = new Img({ ...req, path }, options);

          // internal format parsing is quite hard and may miss actual filename
          image.outputFormat = format || 'png';

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
