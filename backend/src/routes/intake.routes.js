const express = require('express');
const router = express.Router();
const controller = require('../controllers/intake.controller');
const { validate } = require('../middleware/validate');
const { createSchema, updateSchema } = require('../validators/intake.validator');

router.get('/:appointmentId', controller.getByAppointmentId);
router.post('/', validate(createSchema), controller.create);
router.put('/:id', validate(updateSchema), controller.update);

module.exports = router;
