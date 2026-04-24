const express = require('express');
const router = express.Router();
const controller = require('../controllers/waitlist.controller');
const { validate } = require('../middleware/validate');
const { createSchema, statusSchema } = require('../validators/waitlist.validator');

router.get('/', controller.getAll);
router.post('/', validate(createSchema), controller.create);
router.patch('/:id/status', validate(statusSchema), controller.updateStatus);
router.post('/process-cancellation', controller.processCancellation);

module.exports = router;
