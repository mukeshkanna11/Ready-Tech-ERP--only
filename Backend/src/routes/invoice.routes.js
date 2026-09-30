const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const invoiceController = require("../controllers/invoice.controller");

const router = express.Router();

router.use(authenticate);

router.get(
  "/summary",
  invoiceController.getInvoiceSummary
);

router.get(
  "/",
  invoiceController.getInvoices
);

router.post(
  "/",
  invoiceController.createInvoice
);

router.get(
  "/:id/pdf",
  invoiceController.downloadInvoicePdf
);

router.get(
  "/:id",
  invoiceController.getInvoiceById
);

router.put(
  "/:id",
  invoiceController.updateInvoice
);

router.delete(
  "/:id",
  invoiceController.deleteInvoice
);

router.post(
  "/:id/issue",
  invoiceController.issueInvoice
);

router.post(
  "/:id/payment",
  invoiceController.recordPayment
);

router.post(
  "/:id/cancel",
  invoiceController.cancelInvoice
);

router.post(
  "/:id/duplicate",
  invoiceController.duplicateInvoice
);

module.exports = router;