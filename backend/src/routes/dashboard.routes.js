const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboard.controller');

router.get('/summary', controller.getSummary);
router.get('/today', controller.getToday);
router.get('/no-shows', controller.getNoShows);

module.exports = router;
