const Joi = require('joi');

const createSchema = Joi.object({
  first_name: Joi.string().trim().min(1).required(),
  last_name: Joi.string().trim().min(1).required(),
  date_of_birth: Joi.date().iso().required(),
  phone: Joi.string().allow(null, '').optional(),
  email: Joi.string().email().allow(null, '').optional(),
  preferred_contact_method: Joi.string().valid('email', 'phone', 'sms').optional()
});

const updateSchema = Joi.object({
  first_name: Joi.string().trim().min(1).optional(),
  last_name: Joi.string().trim().min(1).optional(),
  date_of_birth: Joi.date().iso().optional(),
  phone: Joi.string().allow(null, '').optional(),
  email: Joi.string().email().allow(null, '').optional(),
  preferred_contact_method: Joi.string().valid('email', 'phone', 'sms').optional()
}).min(1);

module.exports = { createSchema, updateSchema };
