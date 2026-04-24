const Joi = require('joi');

const createSchema = Joi.object({
  appointment_id: Joi.number().integer().positive().required(),
  reason_for_visit: Joi.string().trim().min(1).required(),
  insurance_provider: Joi.string().allow(null, '').optional(),
  insurance_member_id: Joi.string().allow(null, '').optional(),
  allergies: Joi.string().allow(null, '').optional(),
  medications: Joi.string().allow(null, '').optional(),
  emergency_contact_name: Joi.string().allow(null, '').optional(),
  emergency_contact_phone: Joi.string().allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional()
});

const updateSchema = Joi.object({
  reason_for_visit: Joi.string().trim().min(1).optional(),
  insurance_provider: Joi.string().allow(null, '').optional(),
  insurance_member_id: Joi.string().allow(null, '').optional(),
  allergies: Joi.string().allow(null, '').optional(),
  medications: Joi.string().allow(null, '').optional(),
  emergency_contact_name: Joi.string().allow(null, '').optional(),
  emergency_contact_phone: Joi.string().allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional()
}).min(1);

module.exports = { createSchema, updateSchema };
