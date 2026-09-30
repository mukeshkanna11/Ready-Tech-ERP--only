const express = require("express");

const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  payExpense,
  cancelExpense,
  deleteExpense,
  getExpenseSummary,
} = require("../controllers/expense.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

/*
 * Summary
 */
router.get(
  "/summary",
  getExpenseSummary
);

/*
 * CRUD
 */
router.get(
  "/",
  getExpenses
);

router.post(
  "/",
  createExpense
);

router.get(
  "/:id",
  getExpenseById
);

router.put(
  "/:id",
  updateExpense
);

router.delete(
  "/:id",
  deleteExpense
);

/*
 * Workflow
 */
router.post(
  "/:id/submit",
  submitExpense
);

router.post(
  "/:id/approve",
  approveExpense
);

router.post(
  "/:id/reject",
  rejectExpense
);

router.post(
  "/:id/pay",
  payExpense
);

router.post(
  "/:id/cancel",
  cancelExpense
);

module.exports = router;