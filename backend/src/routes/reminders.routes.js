const express = require('express');
const router = express.Router();
const controller = require('../controllers/reminders.controller');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All reminder routes require authentication
router.use(authMiddleware);

router.get('/', requireRole(['admin', 'staff']), controller.getLogs);
router.get('/logs', requireRole(['admin', 'staff']), controller.getLogs);
router.post('/run', requireRole(['admin']), controller.runReminders);

module.exports = router;
