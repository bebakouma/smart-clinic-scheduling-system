const dashboardService = require('../services/dashboard.service');
const { success } = require('../middleware/responseEnvelope');

async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getSummary();
    success(res, summary);
  } catch (err) { next(err); }
}

async function getToday(req, res, next) {
  try {
    const appointments = await dashboardService.getToday();
    success(res, appointments);
  } catch (err) { next(err); }
}

async function getNoShows(req, res, next) {
  try {
    const noShows = await dashboardService.getNoShows();
    success(res, noShows);
  } catch (err) { next(err); }
}

module.exports = { getSummary, getToday, getNoShows };
