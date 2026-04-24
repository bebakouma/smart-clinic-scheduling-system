const intakeService = require('../services/intake.service');
const { success } = require('../middleware/responseEnvelope');

async function getByAppointmentId(req, res, next) {
  try {
    const form = await intakeService.getByAppointmentId(parseInt(req.params.appointmentId));
    success(res, form);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const form = await intakeService.create(req.body);
    success(res, form, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const form = await intakeService.update(parseInt(req.params.id), req.body);
    success(res, form);
  } catch (err) { next(err); }
}

module.exports = { getByAppointmentId, create, update };
