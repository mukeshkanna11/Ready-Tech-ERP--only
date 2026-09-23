const express = require('express');

const userController = require('../controllers/user.controller');

const authenticate = require('../middleware/auth.middleware');
const tenantScope = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get(
  '/',
  userController.list
);

router.get(
  '/:id',
  userController.getById
);

router.put(
  '/:id',
  userController.update
);

router.delete(
  '/:id',
  userController.remove
);

router.patch(
  '/:id/restore',
  userController.restore
);

module.exports = router;