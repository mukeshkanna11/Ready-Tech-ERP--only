const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  cancelPayment,
  refundPayment,
  getPaymentSummary,
} = require("../controllers/payment.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/summary",
  getPaymentSummary
);

router.get(
  "/",
  getPayments
);

router.post(
  "/",
  createPayment
);

router.get(
  "/:id",
  getPaymentById
);

router.put(
  "/:id",
  updatePayment
);

router.delete(
  "/:id",
  deletePayment
);

router.post(
  "/:id/cancel",
  cancelPayment
);

router.post(
  "/:id/refund",
  refundPayment
);

module.exports = router;