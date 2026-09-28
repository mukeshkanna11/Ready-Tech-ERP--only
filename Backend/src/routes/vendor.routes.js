const express = require('express');

const authenticate = require('../middleware/auth.middleware');

const {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  restoreVendor,
} = require('../controllers/vendor.controller');

const router = express.Router();

router.use(authenticate);

// Create
router.post(
  '/',
  createVendor
);

// List
router.get(
  '/',
  getVendors
);

// Get by ID
router.get(
  '/:id',
  getVendorById
);

// Update
router.put(
  '/:id',
  updateVendor
);

// Soft delete
router.delete(
  '/:id',
  deleteVendor
);

// Restore
router.patch(
  '/:id/restore',
  restoreVendor
);

module.exports = router;