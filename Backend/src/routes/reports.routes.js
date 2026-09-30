"use strict";

const express = require("express");

const authenticate = require("../middleware/auth.middleware");

const {
  getOverview,
  getSalesReport,
  getPurchaseReport,
  getInvoiceReport,
  getPaymentReport,
  getExpenseReport,
  getInventoryReport,
  getCustomerReport,
  getVendorReport,
  getProjectReport,
  getTaskReport,
  getWorkflowReport,
} = require("../controllers/report.controller");

const router = express.Router();

router.use(authenticate);

// ============================================================
// REPORT OVERVIEW
// ============================================================

router.get("/overview", getOverview);

// ============================================================
// SALES
// ============================================================

router.get("/sales", getSalesReport);

// ============================================================
// PURCHASE
// ============================================================

router.get("/purchases", getPurchaseReport);

// ============================================================
// INVOICES
// ============================================================

router.get("/invoices", getInvoiceReport);

// ============================================================
// PAYMENTS
// ============================================================

router.get("/payments", getPaymentReport);

// ============================================================
// EXPENSES
// ============================================================

router.get("/expenses", getExpenseReport);

// ============================================================
// INVENTORY
// ============================================================

router.get("/inventory", getInventoryReport);

// ============================================================
// CUSTOMERS
// ============================================================

router.get("/customers", getCustomerReport);

// ============================================================
// VENDORS
// ============================================================

router.get("/vendors", getVendorReport);

// ============================================================
// PROJECTS
// ============================================================

router.get("/projects", getProjectReport);

// ============================================================
// TASKS
// ============================================================

router.get("/tasks", getTaskReport);

// ============================================================
// WORKFLOW
// ============================================================

router.get("/workflows", getWorkflowReport);

module.exports = router;