const Validator = require('ms-amqp-validation');
const validator = new Validator();
validator.init('../schemas', false, true);

module.exports = validator;
