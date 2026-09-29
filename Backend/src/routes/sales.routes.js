const express = require('express');
const authenticate = require('../middleware/auth.middleware');

const {
  createSale,
  getSales,
  getSaleById,
  updateSale,
  confirmSale,
  completeSale,
  cancelSale,
  deleteSale,
  restoreSale,
  getSalesSummary,
} = require('../controllers/sales.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', createSale);

router.get('/', getSales);

router.get('/summary', getSalesSummary);

router.get('/:id', getSaleById);

router.put('/:id', updateSale);

router.post('/:id/confirm', confirmSale);

router.post('/:id/complete', completeSale);

router.post('/:id/cancel', cancelSale);

router.delete('/:id', deleteSale);

router.patch('/:id/restore', restoreSale);

module.exports = router;