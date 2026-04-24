const analyticsService = require('../services/analytics.service');
const { success } = require('../middleware/responseEnvelope');

async function getNoShowRisk(req, res, next) {
  try {
    const risk = await analyticsService.getNoShowRisk(parseInt(req.params.appointmentId));
    success(res, risk);
  } catch (err) { next(err); }
}

async function generateRisk(req, res, next) {
  try {
    const risk = await analyticsService.generateRisk(req.body.appointment_id);
    success(res, risk, 201);
  } catch (err) { next(err); }
}

module.exports = { getNoShowRisk, generateRisk };
