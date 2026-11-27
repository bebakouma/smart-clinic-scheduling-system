const express = require('express');
const router = express.Router();
const controller = require('../controllers/device.controller');
const { validate } = require('../middleware/validate');
const { deviceAuth } = require('../middleware/deviceAuth');
const { deviceEventSchema } = require('../validators/device.validator');

// IoT device events (Task 24).
//
// The token check comes first, so an unauthenticated request is rejected with
// 401 before its body is validated or any data is touched.
// The shared device token is a temporary placeholder until Task 26.
router.use(deviceAuth);

router.post('/events', validate(deviceEventSchema), controller.handleEvent);

module.exports = router;
