const express = require('express');
const router = express.Router();
const controller = require('../controllers/reminders.controller');

router.get('/', controller.getLogs);
router.get('/logs', controller.getLogs);
router.post('/run', controller.runReminders);

module.exports = router;
