const express = require("express");

const leaveController = require("../controllers/leave.controller");

const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(
  authenticate,
  tenantScope
);

router.get("/", leaveController.list);

router.post("/", leaveController.create);

router.get("/:id", leaveController.getById);

router.put("/:id", leaveController.update);

router.patch("/:id/approve", leaveController.approve);

router.patch("/:id/reject", leaveController.reject);

router.patch("/:id/cancel", leaveController.cancel);

router.delete("/:id", leaveController.remove);

module.exports = router;