const express = require('express');
const router = express.Router();
const controller = require('../controllers/patients.controller');
const { validate } = require('../middleware/validate');
const { createSchema, updateSchema } = require('../validators/patients.validator');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createSchema), controller.create);
router.put('/:id', validate(updateSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
