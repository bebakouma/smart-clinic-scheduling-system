const express = require('express');
const router = express.Router();
const controller = require('../controllers/waitlist.controller');
const { validate } = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createSchema, statusSchema } = require('../validators/waitlist.validator');

// All waitlist routes require authentication
router.use(authMiddleware);

router.get('/', requireRole(['admin', 'staff']), controller.getAll);
router.post('/', requireRole(['admin', 'staff']), validate(createSchema), controller.create);
router.patch('/:id/status', requireRole(['admin', 'staff']), validate(statusSchema), controller.updateStatus);
router.post('/process-cancellation', requireRole(['admin', 'staff']), controller.processCancellation);

module.exports = router;
