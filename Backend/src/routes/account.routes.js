const express = require("express");

const {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountSummary,
} = require("../controllers/account.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/summary", getAccountSummary);

router.get("/", getAccounts);

router.post("/", createAccount);

router.get("/:id", getAccountById);

router.put("/:id", updateAccount);

router.delete("/:id", deleteAccount);

module.exports = router;