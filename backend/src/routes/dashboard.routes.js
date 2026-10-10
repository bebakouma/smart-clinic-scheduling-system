const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboard.controller');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All dashboard routes require authentication (all roles may view)
router.use(authMiddleware);

const allRoles = ['admin', 'staff', 'provider', 'readonly'];
router.get('/summary', requireRole(allRoles), controller.getSummary);
router.get('/today', requireRole(allRoles), controller.getToday);
router.get('/no-shows', requireRole(allRoles), controller.getNoShows);

module.exports = router;
