const Joi = require('joi');

const createSchema = Joi.object({
  patient_id: Joi.number().integer().positive().required(),
  requested_appointment_type: Joi.string().trim().min(1).required(),
  preferred_date: Joi.date().iso().allow(null).optional(),
  preferred_time_range: Joi.string().allow(null, '').optional()
});

const statusSchema = Joi.object({
  status: Joi.string().valid('waiting', 'notified', 'booked', 'expired').required()
});

module.exports = { createSchema, statusSchema };
