const express = require('express');
const router = express.Router();
const controller = require('../controllers/intake.controller');
const { validate } = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createSchema, updateSchema } = require('../validators/intake.validator');

// All intake routes require authentication
router.use(authMiddleware);

router.get('/:appointmentId', requireRole(['admin', 'staff', 'provider']), controller.getByAppointmentId);
router.post('/', requireRole(['admin', 'staff']), validate(createSchema), controller.create);
router.put('/:id', requireRole(['admin', 'staff']), validate(updateSchema), controller.update);

module.exports = router;
