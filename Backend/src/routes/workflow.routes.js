const express = require("express");

const {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  restoreWorkflow,
  activateWorkflow,
  deactivateWorkflow,

  startWorkflow,
  getWorkflowInstances,
  getPendingApprovals,
  getWorkflowInstanceById,

  approveWorkflow,
  rejectWorkflow,
  cancelWorkflow,

  getWorkflowSummary,
} = require("../controllers/workflow.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

// ============================================================
// SUMMARY
// ============================================================

router.get(
  "/summary",
  getWorkflowSummary
);

// ============================================================
// WORKFLOW INSTANCES
// ============================================================

router.get(
  "/instances/all",
  getWorkflowInstances
);

router.get(
  "/instances/pending",
  getPendingApprovals
);

router.post(
  "/instances/start",
  startWorkflow
);

router.get(
  "/instances/:id",
  getWorkflowInstanceById
);

router.post(
  "/instances/:id/approve",
  approveWorkflow
);

router.post(
  "/instances/:id/reject",
  rejectWorkflow
);

router.post(
  "/instances/:id/cancel",
  cancelWorkflow
);

// ============================================================
// WORKFLOW DEFINITIONS
// ============================================================

router.get(
  "/",
  getWorkflows
);

router.post(
  "/",
  createWorkflow
);

router.get(
  "/:id",
  getWorkflowById
);

router.put(
  "/:id",
  updateWorkflow
);

router.delete(
  "/:id",
  deleteWorkflow
);

router.post(
  "/:id/restore",
  restoreWorkflow
);

router.post(
  "/:id/activate",
  activateWorkflow
);

router.post(
  "/:id/deactivate",
  deactivateWorkflow
);

module.exports = router;