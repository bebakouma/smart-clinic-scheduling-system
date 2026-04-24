const waitlistService = require('../services/waitlist.service');
const { success } = require('../middleware/responseEnvelope');

async function getAll(req, res, next) {
  try {
    const entries = await waitlistService.getAll();
    success(res, entries);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const entry = await waitlistService.create(req.body);
    success(res, entry, 201);
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const entry = await waitlistService.updateStatus(parseInt(req.params.id), req.body.status);
    success(res, entry);
  } catch (err) { next(err); }
}

async function processCancellation(req, res, next) {
  try {
    const result = await waitlistService.processCancellation(req.body);
    success(res, result || { message: 'No matching waitlist entries found' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, updateStatus, processCancellation };
