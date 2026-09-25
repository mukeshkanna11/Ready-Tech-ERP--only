const express = require("express");

const hrReportsController = require("../controllers/hrReport.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

/*
 * Main HR dashboard
 */
router.get(
  "/dashboard",
  hrReportsController.dashboard
);

/*
 * Employee reports
 */
router.get(
  "/employees",
  hrReportsController.employeeOverview
);

router.get(
  "/employees/branches",
  hrReportsController.branchEmployeeReport
);

/*
 * Attendance reports
 */
router.get(
  "/attendance",
  hrReportsController.attendanceReport
);

/*
 * Leave reports
 */
router.get(
  "/leaves",
  hrReportsController.leaveReport
);

/*
 * Payroll reports
 */
router.get(
  "/payroll",
  hrReportsController.payrollReport
);

/*
 * Payslip reports
 */
router.get(
  "/payslips",
  hrReportsController.payslipReport
);

/*
 * Performance reports
 */
router.get(
  "/performance",
  hrReportsController.performanceReport
);

module.exports = router;