const Promise = require('bluebird');
const Errors = require('common-errors');
const ir = require('image-resizer-makeomatic');
const config = require('../config.js');
const pump = require('pump');
const compact = require('lodash/compact');

const { getRoute, getTimeout } = config;
const { img: Img, streams } = ir;
const { identify, resize, filter, optimize, restify: Restify } = streams;

// amqp route
const ROUTE_NAME = 'info';
const numbers = /\d+/g;
const toHex = x => (+x).toString(16);
const InvalidBackgroundError = new Errors.HttpStatusError(400, 'background color doesn\'t match settings');

/**
 * Converts rgb to hex
 * @return {String}
 */
function rgbToHex(input) {
  return `#${input.match(numbers).map(toHex).join('')}`;
}

/**
 * @api {get} /preview/:alias/(:modifiers)/:filename(.:format) Get preview of a provided file
 * @apiVersion 1.0.0
 * @apiName PreviewFile
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns optimized image with provided modifiers that is supposed to be cached by CDN
 *
 * @apiParam (Params) {String} filename
 * @apiParam (Params) {String} format: png, jpeg, webp
 * @apiParam (Params) {String} modifiers:
 *       height:       eg. h500
 *      width:        eg. w200
 *      square:       eg. s50
 *      crop:         eg. cfill
 *      top:          eg. y12
 *      left:         eg. x200
 *      gravity:      eg. gs, gne
 *      filter:       eg. fsepia
 *      external:     eg. efacebook
 *      quality:      eg. q90
 *
 *
 * @apiExample {curl} Example usage:
 *   curl "https://api-sandbox-dev.matic.ninja/api/files/preview/bamboo/h200-w200-cfill/3c69b6f9-02db-4057-8b36-91c19e6ee43f.jpeg"
 *
 * @apiUse ValidationError
 * @apiUse FileNotFoundError
 *
 * @apiSuccessExample {json} Success-Download:
 *     HTTP/1.1 200 OK
 *     binarycontentofimage
 */

const modRegExp = /(?:(?:[hwscyxq][1-9][0-9]*|[cgf][a-z]+|b[0-9a-f]{6})-?){1,9}/;
const ALLOWED_FORMATS = Img.validOutputFormats;

exports.get = {
  paths: [
    '/preview/:alias/:modifiers/:filename',
    '/preview/:alias/:filename',
  ],
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      const { params } = req;
      const { alias, modifiers } = params;
      let { filename } = params;

      if (modifiers && !modRegExp.test(modifiers)) {
        throw new Errors.HttpStatusError(400, 'invalid modifiers');
      }

      const parts = filename.split('.');
      let format = parts.pop();
      if (ALLOWED_FORMATS.indexOf(format) >= 0) {
        filename = parts.join('.');
      } else {
        format = 'jpeg';
      }

      return req.amqp
        .publishAndWait(getRoute(ROUTE_NAME), { filename, username: alias }, { timeout: getTimeout(ROUTE_NAME) })
        .then((data) => {
          const preview = data.file.preview;
          if (!preview) {
            throw new Errors.HttpStatusError(412, 'preview was not extracted yet');
          }

          const path = compact([modifiers, preview]).join('/');
          const image = new Img({ ...req, path });

          // internal format parsing is quite hard and may miss actual filename
          image.outputFormat = format;

          if (typeof res.handledGzip === 'function') {
            res.handledGzip();
            res.removeHeader('Content-Encoding');
          }

          // if we have padding set - verify it matches internal data
          const paddingColor = image.modifiers.paddingColor;
          if (paddingColor) {
            let backgroundColor = data.file.backgroundColor;

            // no background color - mismatch
            if (!backgroundColor) {
              throw InvalidBackgroundError;
            }

            // translate to hex if we have it stored in RGB
            if (backgroundColor.charAt(0) !== '#') {
              backgroundColor = rgbToHex(backgroundColor);
            }

            // verify that colors match
            if (backgroundColor !== paddingColor) {
              throw InvalidBackgroundError;
            }
          }

          return Promise.fromNode((done) => {
            pump(
              image.getFile(),
              identify(),
              resize(),
              filter(),
              optimize(),
              new Restify(req, res),
              err => (err ? done(err) : done(null, false))
            );
          });
        })
        .asCallback(next);
    },
  },
};
