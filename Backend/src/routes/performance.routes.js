const express = require("express");

const performanceController = require("../controllers/performance.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get(
  "/",
  performanceController.list
);

router.post(
  "/",
  performanceController.create
);

router.get(
  "/:id",
  performanceController.getById
);

router.put(
  "/:id",
  performanceController.update
);

router.patch(
  "/:id/submit",
  performanceController.submit
);

router.patch(
  "/:id/review",
  performanceController.review
);

router.patch(
  "/:id/approve",
  performanceController.approve
);

router.patch(
  "/:id/close",
  performanceController.close
);

router.delete(
  "/:id",
  performanceController.remove
);

module.exports = router;