const express = require("express");

const holidayController = require("../controllers/holiday.controller");

const authenticate = require("../middleware/auth.middleware");

const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get("/", holidayController.list);

router.post("/", holidayController.create);

router.get("/:id", holidayController.getById);

router.put("/:id", holidayController.update);

router.patch(
  "/:id/status",
  holidayController.toggleStatus
);

router.delete(
  "/:id",
  holidayController.remove
);

module.exports = router;