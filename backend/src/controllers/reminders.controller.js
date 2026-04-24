const remindersService = require('../services/reminders.service');
const { success } = require('../middleware/responseEnvelope');

async function getLogs(req, res, next) {
  try {
    const filters = {};
    if (req.query.appointment_id) filters.appointment_id = parseInt(req.query.appointment_id);
    if (req.query.patient_id) filters.patient_id = parseInt(req.query.patient_id);
    const logs = await remindersService.getLogs(filters);
    success(res, logs);
  } catch (err) { next(err); }
}

async function runReminders(req, res, next) {
  try {
    const results = await remindersService.runReminders();
    success(res, { reminders_sent: results.length, results });
  } catch (err) { next(err); }
}

module.exports = { getLogs, runReminders };
