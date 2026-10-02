const authService = require('../services/auth.service');
const { success } = require('../middleware/responseEnvelope');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    success(res, user, 201);
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    success(res, result);
  } catch (err) { next(err); }
}

module.exports = { register, login };
