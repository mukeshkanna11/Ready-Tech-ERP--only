const express = require("express");

const attendanceController = require("../controllers/attendance.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get("/", attendanceController.list);
router.post("/", attendanceController.create);
router.get("/:id", attendanceController.getById);
router.put("/:id", attendanceController.update);
router.delete("/:id", attendanceController.remove);

module.exports = router;  