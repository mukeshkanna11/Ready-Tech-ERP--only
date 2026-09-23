const express = require("express");
const departmentController = require("../controllers/department.controller");
const authenticate = require("../middleware/auth.middleware");
const tenantScope = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, tenantScope);

router.get("/", departmentController.list);
router.get("/:id", departmentController.getById);

module.exports = router;