const config = require('../config.js');
const get = require('lodash/get');
const path = require('path');

const { getRoute, getTimeout } = config;
const ROUTE_NAME = 'download';

// helper to generate JSON meta for player
function generateJSON(amqp, filename, username) {
  // basic message
  const message = { uploadId: path.basename(filename, '.json') };

  if (username) {
    message.username = username;
  }

  return amqp
    .publishAndWait(getRoute(ROUTE_NAME), message, { timeout: getTimeout(ROUTE_NAME) })
    .then((data) => {
      const { files, name, urls, username: owner } = data;
      const json = { name, owner };
      const materials = json.materials = [];

      // create metadata file
      files.forEach((file, idx) => {
        const type = file.type;
        if (type === 'c-texture') {
          materials.push({ texture: urls[idx] });
        } else if (type === 'c-bin') {
          json.file = urls[idx];
          json.size = file.decompressedLength || file.contentLength;
        }
      });

      return { json, response: data };
    });
}
exports.generateJSON = generateJSON;

/**
 * @api {get} /:filename.json Get model meta info
 * @apiVersion 1.0.0
 * @apiName PlayerMeta
 * @apiGroup Files
 * @apiPermission none
 *
 * @apiDescription Returns player information
 *
 * @apiParam (Params) {String} filename
 *
 * @apiExample {curl} Example usage:
 *   curl -H 'Accept: application/vnd.api+json' \
 *     "https://api-sandbox-dev.matic.ninja/api/files/9058df9-983e-43b6-8755-84b92c272357.json"
 *
 * @apiUse FileNotFoundError
 * @apiUse PreconditionFailedError
 *
 * @apiSuccessExample {json} Success-Download:
 *     HTTP/1.1 200 OK
 *     {
 *        "name": "Panda eating bamboo",
 *        "file": "https://cdn.google.com/path/to/file.bin.gz",
 *        "size": 321792481,
 *        "materials": [
 *          {
 *            "texture": "https://cdn.google.com/path/to/texture.jpeg"
 *          },
 *          {
 *            "texture": "https://cdn.google.com/path/to/texture_2.jpeg"
 *          }
 *        ]
 *     }
 */
exports.get = {
  path: '/player/:filename',
  middleware: ['conditional-auth'],
  handlers: {
    '1.0.0': function getDownloadURL(req, res, next) {
      const { filename } = req.params;

      // force .json ext
      if (path.extname(filename) !== '.json') {
        return next('route');
      }

      return generateJSON(req.amqp, filename, get(req, 'user.id'))
        .then((data) => {
          res.contentType = 'application/json';
          res.send(data.json);
          return false;
        })
        .asCallback(next);
    },
  },
};
