const express = require("express");

const authenticate = require("../middleware/auth.middleware");

const {
  getTrialBalance,
  getGeneralLedger,
  getProfitAndLoss,
  getBalanceSheet,
  getAccountLedger,
  getFinancialSummary,
} = require("../controllers/financialReport.controller");

const router = express.Router();

router.use(authenticate);

router.get("/summary", getFinancialSummary);

router.get("/trial-balance", getTrialBalance);

router.get("/general-ledger", getGeneralLedger);

router.get("/profit-loss", getProfitAndLoss);

router.get("/balance-sheet", getBalanceSheet);

router.get("/account-ledger/:accountId", getAccountLedger);

module.exports = router;