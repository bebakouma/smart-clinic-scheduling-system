const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointments.controller');
const { validate } = require('../middleware/validate');
const { createSchema, updateSchema, statusSchema } = require('../validators/appointments.validator');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createSchema), controller.create);
router.put('/:id', validate(updateSchema), controller.update);
router.patch('/:id/status', validate(statusSchema), controller.updateStatus);
router.delete('/:id', controller.remove);

module.exports = router;
