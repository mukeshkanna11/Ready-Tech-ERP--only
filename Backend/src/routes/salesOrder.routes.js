const express = require('express');

const authenticate = require('../middleware/auth.middleware');

const {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  confirmSalesOrder,
  processSalesOrder,
  markSalesOrderDelivered,
  cancelSalesOrder,
  closeSalesOrder,
  deleteSalesOrder,
  restoreSalesOrder,
  duplicateSalesOrder,
  getSalesOrdersSummary,
} = require('../controllers/salesOrder.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', createSalesOrder);

router.get('/', getSalesOrders);

router.get(
  '/summary',
  getSalesOrdersSummary
);

router.post(
  '/:id/confirm',
  confirmSalesOrder
);

router.post(
  '/:id/process',
  processSalesOrder
);

router.post(
  '/:id/deliver',
  markSalesOrderDelivered
);

router.post(
  '/:id/cancel',
  cancelSalesOrder
);

router.post(
  '/:id/close',
  closeSalesOrder
);

router.post(
  '/:id/duplicate',
  duplicateSalesOrder
);

router.get(
  '/:id',
  getSalesOrderById
);

router.put(
  '/:id',
  updateSalesOrder
);

router.delete(
  '/:id',
  deleteSalesOrder
);

router.patch(
  '/:id/restore',
  restoreSalesOrder
);

module.exports = router;