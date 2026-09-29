const express = require('express');

const authenticate = require('../middleware/auth.middleware');

const {
  createInventory,
  getInventory,
  getInventoryById,
  updateInventory,
  adjustStock,
  getStockMovements,
  deleteInventory,
  restoreInventory,
} = require('../controllers/inventory.controller');

const router = express.Router();

/*
 * Existing ERP authentication.
 * DO NOT CHANGE AUTHENTICATION.
 */
router.use(authenticate);

/*
 * Inventory master/list
 */
router.post(
  '/',
  createInventory
);

router.get(
  '/',
  getInventory
);

/*
 * Stock movement history.
 *
 * Keep this BEFORE /:id.
 */
router.get(
  '/movements',
  getStockMovements
);

/*
 * Stock adjustment.
 */
router.post(
  '/adjust',
  adjustStock
);

/*
 * Individual inventory record.
 */
router.get(
  '/:id',
  getInventoryById
);

router.put(
  '/:id',
  updateInventory
);

router.delete(
  '/:id',
  deleteInventory
);

router.patch(
  '/:id/restore',
  restoreInventory
);

module.exports = router;