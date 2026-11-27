const Joi = require('joi');

// Unknown fields are rejected (Joi's default), so a device cannot send extra data.
const deviceEventSchema = Joi.object({
  deviceId: Joi.string().pattern(/^[A-Za-z0-9_-]{1,64}$/).required(),
  type: Joi.string().valid('checkin', 'occupancy').required(),
  confirmationCode: Joi.when('type', {
    is: 'checkin',
    then: Joi.string().trim().min(1).max(32).required(),
    otherwise: Joi.forbidden()
  }),
  count: Joi.when('type', {
    is: 'occupancy',
    then: Joi.number().integer().min(0).max(1000).required(),
    otherwise: Joi.forbidden()
  }),
  timestamp: Joi.date().iso().optional()
});

module.exports = { deviceEventSchema };
