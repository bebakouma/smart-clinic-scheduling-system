const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointments.controller');
const { validate } = require('../middleware/validate');
const { kioskSchema } = require('../validators/appointments.validator');

// Patient self check-in (Task 23).
//
// These routes have NO staff login: a patient at the kiosk is not a staff user.
// Identity is the confirmation code plus date of birth (see appointments.service).
//
// Interim protection: a stricter rate limit (applied in app.js), generic errors,
// and a minimal response. Device authentication (a token that only registered
// kiosks hold) is added in Task 26 and will be required on these routes.

router.post('/lookup', validate(kioskSchema), controller.kioskLookup);
router.post('/checkin', validate(kioskSchema), controller.kioskCheckIn);

module.exports = router;
