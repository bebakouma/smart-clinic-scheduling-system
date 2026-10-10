const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointments.controller');
const { validate } = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createSchema, updateSchema, statusSchema, rescheduleSchema } = require('../validators/appointments.validator');

// All appointment routes require authentication
router.use(authMiddleware);

router.get('/', requireRole(['admin', 'staff', 'provider', 'readonly']), controller.getAll);
router.get('/:id', requireRole(['admin', 'staff', 'provider', 'readonly']), controller.getById);
router.post('/', requireRole(['admin', 'staff']), validate(createSchema), controller.create);
router.put('/:id', requireRole(['admin', 'staff']), validate(updateSchema), controller.update);
router.patch('/:id/status', requireRole(['admin', 'staff', 'provider']), validate(statusSchema), controller.updateStatus);
router.patch('/:id/confirm', requireRole(['admin', 'staff']), controller.confirm);
router.patch('/:id/reschedule', requireRole(['admin', 'staff']), validate(rescheduleSchema), controller.reschedule);
router.delete('/:id', requireRole(['admin']), controller.remove);

module.exports = router;
