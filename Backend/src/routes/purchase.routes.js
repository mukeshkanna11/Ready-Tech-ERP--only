const express = require('express');

const authenticate = require('../middleware/auth.middleware');

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  restorePurchase,
} = require('../controllers/purchase.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', createPurchase);

router.get('/', getPurchases);

router.get('/:id', getPurchaseById);

router.put('/:id', updatePurchase);

router.delete('/:id', deletePurchase);

router.patch('/:id/restore', restorePurchase);

module.exports = router;