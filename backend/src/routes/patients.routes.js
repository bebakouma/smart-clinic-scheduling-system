const express = require('express');
const router = express.Router();
const controller = require('../controllers/patients.controller');
const { validate } = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createSchema, updateSchema } = require('../validators/patients.validator');

// All patient routes require authentication
router.use(authMiddleware);

router.get('/', requireRole(['admin', 'staff', 'provider']), controller.getAll);
router.get('/:id', requireRole(['admin', 'staff', 'provider']), controller.getById);
router.post('/', requireRole(['admin', 'staff']), validate(createSchema), controller.create);
router.put('/:id', requireRole(['admin', 'staff']), validate(updateSchema), controller.update);
router.delete('/:id', requireRole(['admin']), controller.remove);

module.exports = router;
