const express = require("express");

const shiftController = require("../controllers/shift.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get("/", shiftController.list);

router.post("/", shiftController.create);

router.get("/:id", shiftController.getById);

router.put("/:id", shiftController.update);

router.patch("/:id/status", shiftController.toggleStatus);

router.delete("/:id", shiftController.remove);

module.exports = router;