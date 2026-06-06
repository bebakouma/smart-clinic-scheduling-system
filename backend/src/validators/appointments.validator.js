const Joi = require('joi');

const createSchema = Joi.object({
  patient_id: Joi.number().integer().positive().required(),
  provider_name: Joi.string().trim().min(1).required(),
  appointment_type: Joi.string().trim().min(1).required(),
  appointment_datetime: Joi.date().iso().required(),
  notes: Joi.string().allow(null, '').optional()
});

const updateSchema = Joi.object({
  provider_name: Joi.string().trim().min(1).optional(),
  appointment_type: Joi.string().trim().min(1).optional(),
  appointment_datetime: Joi.date().iso().optional(),
  notes: Joi.string().allow(null, '').optional()
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show').required()
});

const rescheduleSchema = Joi.object({
  appointment_datetime: Joi.date().iso().required(),
  reason: Joi.string().trim().allow(null, '').optional()
});

module.exports = { createSchema, updateSchema, statusSchema, rescheduleSchema };
