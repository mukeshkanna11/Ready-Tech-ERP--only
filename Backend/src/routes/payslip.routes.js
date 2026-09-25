const express = require("express");

const payslipController = require("../controllers/payslip.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get(
  "/",
  payslipController.list
);

router.post(
  "/generate",
  payslipController.generate
);

router.get(
  "/:id",
  payslipController.getById
);

router.delete(
  "/:id",
  payslipController.remove
);

module.exports = router;