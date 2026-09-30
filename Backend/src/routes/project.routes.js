const express = require("express");

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  restoreProject,
  getProjectSummary,
  syncProjectProgress,
} = require("../controllers/project.controller");

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskSummary,
} = require("../controllers/task.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

// ============================================================
// AUTH
// ============================================================

router.use(authenticate);

// ============================================================
// PROJECT SUMMARY
// ============================================================

router.get(
  "/summary",
  getProjectSummary
);

// ============================================================
// TASK ROUTES
// IMPORTANT: Keep these BEFORE /:id
// ============================================================

router.get(
  "/tasks/summary",
  getTaskSummary
);

router.get(
  "/tasks",
  getTasks
);

router.post(
  "/tasks",
  createTask
);

router.get(
  "/tasks/:id",
  getTaskById
);

router.put(
  "/tasks/:id",
  updateTask
);

router.delete(
  "/tasks/:id",
  deleteTask
);

// ============================================================
// PROJECT CRUD
// ============================================================

router.get(
  "/",
  getProjects
);

router.post(
  "/",
  createProject
);

router.get(
  "/:id",
  getProjectById
);

router.put(
  "/:id",
  updateProject
);

router.delete(
  "/:id",
  deleteProject
);

// ============================================================
// PROJECT ACTIONS
// ============================================================

router.post(
  "/:id/restore",
  restoreProject
);

router.post(
  "/:id/sync-progress",
  syncProjectProgress
);

module.exports = router;