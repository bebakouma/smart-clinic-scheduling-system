const deviceService = require('../services/device.service');
const { success } = require('../middleware/responseEnvelope');

async function handleEvent(req, res, next) {
  try {
    const result = await deviceService.handleEvent(req.body);
    success(res, result);
  } catch (err) { next(err); }
}

module.exports = { handleEvent };
