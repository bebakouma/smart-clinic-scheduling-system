const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointments.controller');
const { validate } = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { checkinSchema } = require('../validators/appointments.validator');

// Check-in is staff-managed for now (Task 22). Authorized clinic staff mark a
// patient checked in when they arrive. Patient self check-in via a kiosk / IoT
// device is added later (Tasks 23-26) and will use device authentication.
router.use(authMiddleware);

// POST /api/checkin — by appointmentId or confirmationCode
router.post('/', requireRole(['admin', 'staff']), validate(checkinSchema), controller.checkIn);

module.exports = router;
