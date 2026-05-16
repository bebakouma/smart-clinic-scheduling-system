const patientsService = require('../services/patients.service');
const { success } = require('../middleware/responseEnvelope');

async function getAll(req, res, next) {
  try {
    const search = req.query.search || null;
    const patients = await patientsService.getAll(search);
    success(res, patients);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const patient = await patientsService.getById(parseInt(req.params.id));
    success(res, patient);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const patient = await patientsService.create(req.body);
    success(res, patient, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const patient = await patientsService.update(parseInt(req.params.id), req.body);
    success(res, patient);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await patientsService.remove(parseInt(req.params.id));
    success(res, { message: 'Patient deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };
