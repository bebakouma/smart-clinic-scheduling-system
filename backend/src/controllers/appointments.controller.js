const appointmentsService = require('../services/appointments.service');
const { success } = require('../middleware/responseEnvelope');

async function getAll(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    const appointments = await appointmentsService.getAll(filters);
    success(res, appointments);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const appointment = await appointmentsService.getById(parseInt(req.params.id));
    success(res, appointment);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const appointment = await appointmentsService.create(req.body);
    success(res, appointment, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const appointment = await appointmentsService.update(parseInt(req.params.id), req.body);
    success(res, appointment);
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const appointment = await appointmentsService.updateStatus(parseInt(req.params.id), req.body.status);
    success(res, appointment);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await appointmentsService.remove(parseInt(req.params.id));
    success(res, { message: 'Appointment deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, updateStatus, remove };
