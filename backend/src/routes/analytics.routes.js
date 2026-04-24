const express = require('express');
const router = express.Router();
const controller = require('../controllers/analytics.controller');

router.get('/no-show-risk/:appointmentId', controller.getNoShowRisk);
router.post('/generate-risk', controller.generateRisk);

module.exports = router;
