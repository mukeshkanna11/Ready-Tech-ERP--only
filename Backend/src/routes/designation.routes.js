const express = require("express");
const designationController = require("../controllers/designation.controller");
const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, tenantScope);

router.get("/", designationController.list);
router.get("/:id", designationController.getById);

module.exports = router;