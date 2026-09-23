const express = require("express");

const employeeController = require("../controllers/employee.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get(
  "/",
  employeeController.list
);

router.post(
  "/",
  employeeController.create
);

router.get(
  "/:id",
  employeeController.getById
);

router.put(
  "/:id",
  employeeController.update
);

router.delete(
  "/:id",
  employeeController.remove
);

router.patch(
  "/:id/restore",
  employeeController.restore
);

module.exports = router;