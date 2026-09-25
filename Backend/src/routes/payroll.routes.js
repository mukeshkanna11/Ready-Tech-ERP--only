const express = require("express");

const payrollController = require("../controllers/payroll.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get(
  "/",
  payrollController.list
);

router.post(
  "/",
  payrollController.create
);

router.get(
  "/:id",
  payrollController.getById
);

router.put(
  "/:id",
  payrollController.update
);

router.patch(
  "/:id/process",
  payrollController.processPayroll
);

router.patch(
  "/:id/approve",
  payrollController.approvePayroll
);

router.patch(
  "/:id/pay",
  payrollController.markPaid
);

router.patch(
  "/:id/cancel",
  payrollController.cancelPayroll
);

router.delete(
  "/:id",
  payrollController.remove
);

module.exports = router;