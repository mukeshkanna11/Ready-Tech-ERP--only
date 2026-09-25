const express = require("express");

const salaryStructureController = require("../controllers/salaryStructure.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

/*
 * IMPORTANT:
 * Static routes must come before /:id
 */
router.get(
  "/active",
  salaryStructureController.getActive
);

router.get(
  "/applicable",
  salaryStructureController.getApplicable
);

router.get(
  "/",
  salaryStructureController.list
);

router.post(
  "/",
  salaryStructureController.create
);

router.get(
  "/:id",
  salaryStructureController.getById
);

router.put(
  "/:id",
  salaryStructureController.update
);

router.patch(
  "/:id/toggle-status",
  salaryStructureController.toggleStatus
);

router.delete(
  "/:id",
  salaryStructureController.remove
);

module.exports = router;