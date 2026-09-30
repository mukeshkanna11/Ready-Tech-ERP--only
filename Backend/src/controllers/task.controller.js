const mongoose = require("mongoose");

const Task = require("../models/Task");
const Project = require("../models/Project");

const {
  ensureBranchBelongsToCompany,
  ensureUserBelongsToCompany,
  calculateProjectProgress,
  getCompanyId,
} = require("../services/project.service");

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : defaultValue;
};

const validateProgress = (progress) => {
  const value = normalizeNumber(progress, 0);

  if (value < 0 || value > 100) {
    throw new Error("Progress must be between 0 and 100");
  }

  return value;
};

const validateDateRange = (startDate, dueDate) => {
  if (!startDate || !dueDate) {
    return;
  }

  const start = new Date(startDate);
  const due = new Date(dueDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(due.getTime())
  ) {
    throw new Error("Invalid task date");
  }

  if (due < start) {
    throw new Error("Due date cannot be before start date");
  }
};

const generateTaskNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const prefix = `TASK-${year}-`;

  const lastTask = await Task.findOne({
    companyId,
    taskNumber: new RegExp(`^${prefix}\\d+$`, "i"),
  })
    .sort({ taskNumber: -1 })
    .select("taskNumber")
    .lean();

  let sequence = 1;

  if (lastTask?.taskNumber) {
    const lastNumber = Number(
      lastTask.taskNumber.split("-").pop()
    );

    if (Number.isFinite(lastNumber)) {
      sequence = lastNumber + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, "0")}`;
};

const getProjectForCompany = async (
  projectId,
  companyId
) => {
  if (!isValidObjectId(projectId)) {
    return null;
  }

  return Project.findOne({
    _id: projectId,
    companyId,
    deletedAt: null,
  });
};

const syncProjectAfterTaskChange = async (
  projectId,
  companyId
) => {
  const progress = await calculateProjectProgress(
    projectId,
    companyId
  );

  await Project.updateOne(
    {
      _id: projectId,
      companyId,
      deletedAt: null,
    },
    {
      $set: {
        progress,
        updatedAt: new Date(),
      },
    }
  );

  return progress;
};

// ============================================================
// CREATE TASK
// POST /api/projects/tasks
// ============================================================

const createTask = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const {
      projectId,
      branchId,
      taskNumber,
      title,
      description,
      assignedTo,
      priority,
      status,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      progress,
      tags,
      notes,
    } = req.body;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // --------------------------------------------------------
    // Project validation
    // --------------------------------------------------------

    const project = await getProjectForCompany(
      projectId,
      companyId
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // --------------------------------------------------------
    // Branch validation
    // --------------------------------------------------------

    if (branchId) {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      await ensureBranchBelongsToCompany(
        branchId,
        companyId
      );
    }

    // --------------------------------------------------------
    // User validation
    // --------------------------------------------------------

    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      await ensureUserBelongsToCompany(
        assignedTo,
        companyId
      );
    }

    // --------------------------------------------------------
    // Date validation
    // --------------------------------------------------------

    try {
      validateDateRange(startDate, dueDate);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------------
    // Progress validation
    // --------------------------------------------------------

    let taskProgress = 0;

    try {
      taskProgress = validateProgress(progress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------

    const allowedStatuses = [
      "todo",
      "in_progress",
      "review",
      "completed",
      "cancelled",
    ];

    const taskStatus = status || "todo";

    if (!allowedStatuses.includes(taskStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    // Automatically complete a task at 100%
    if (taskProgress === 100 && taskStatus !== "cancelled") {
      req.body.status = "completed";
    }

    // --------------------------------------------------------
    // Priority
    // --------------------------------------------------------

    const allowedPriorities = [
      "low",
      "medium",
      "high",
      "urgent",
    ];

    const taskPriority = priority || "medium";

    if (!allowedPriorities.includes(taskPriority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    // --------------------------------------------------------
    // Task number
    // --------------------------------------------------------

    let finalTaskNumber = taskNumber
      ? String(taskNumber).trim().toUpperCase()
      : await generateTaskNumber(companyId);

    const existingTask = await Task.findOne({
      companyId,
      taskNumber: finalTaskNumber,
      deletedAt: null,
    });

    if (existingTask) {
      return res.status(409).json({
        success: false,
        message: "Task number already exists",
      });
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------

    const task = await Task.create({
      companyId,
      projectId,
      branchId: branchId || null,

      taskNumber: finalTaskNumber,

      title: String(title).trim(),

      description:
        description !== undefined
          ? String(description).trim()
          : "",

      assignedTo: assignedTo || null,

      priority: taskPriority,

      status:
        taskProgress === 100 &&
        taskStatus !== "cancelled"
          ? "completed"
          : taskStatus,

      startDate: startDate || null,
      dueDate: dueDate || null,

      estimatedHours: normalizeNumber(
        estimatedHours,
        0
      ),

      actualHours: normalizeNumber(
        actualHours,
        0
      ),

      progress: taskProgress,

      tags: Array.isArray(tags)
        ? tags
            .map((tag) => String(tag).trim())
            .filter(Boolean)
        : [],

      notes:
        notes !== undefined
          ? String(notes).trim()
          : "",

      createdBy: req.userId || null,
      updatedBy: req.userId || null,
    });

    // --------------------------------------------------------
    // Sync project progress
    // --------------------------------------------------------

    await syncProjectAfterTaskChange(
      projectId,
      companyId
    );

    const populatedTask = await Task.findOne({
      _id: task._id,
      companyId,
    })
      .populate(
        "projectId",
        "projectNumber name status"
      )
      .populate(
        "assignedTo",
        "name email"
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("createTask error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Task number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
};

// ============================================================
// GET TASKS
// GET /api/projects/tasks
// ============================================================

const getTasks = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const {
      page = 1,
      limit = 20,
      search = "",
      projectId,
      assignedTo,
      branchId,
      status,
      priority,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const filter = {
      companyId,
      deletedAt: null,
    };

    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    if (search.trim()) {
      filter.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          taskNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // --------------------------------------------------------
    // Filters
    // --------------------------------------------------------

    if (projectId) {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      filter.projectId = projectId;
    }

    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      filter.assignedTo = assignedTo;
    }

    if (branchId) {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      filter.branchId = branchId;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    // --------------------------------------------------------
    // Sorting
    // --------------------------------------------------------

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "taskNumber",
      "title",
      "priority",
      "status",
      "dueDate",
      "progress",
    ];

    const safeSortBy = allowedSortFields.includes(
      sortBy
    )
      ? sortBy
      : "createdAt";

    const safeSortOrder =
      String(sortOrder).toLowerCase() === "asc"
        ? 1
        : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };

    // --------------------------------------------------------
    // Query
    // --------------------------------------------------------

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate(
          "projectId",
          "projectNumber name status"
        )
        .populate(
          "assignedTo",
          "name email"
        )
        .populate(
          "branchId",
          "name code"
        )
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Task.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error("getTasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

// ============================================================
// GET TASK BY ID
// GET /api/projects/tasks/:id
// ============================================================

const getTaskById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    })
      .populate(
        "projectId",
        "projectNumber name status progress customerId"
      )
      .populate(
        "assignedTo",
        "name email"
      )
      .populate(
        "branchId",
        "name code"
      )
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("getTaskById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE TASK
// PUT /api/projects/tasks/:id
// ============================================================

const updateTask = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const {
      projectId,
      branchId,
      taskNumber,
      title,
      description,
      assignedTo,
      priority,
      status,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      progress,
      tags,
      notes,
    } = req.body;

    // --------------------------------------------------------
    // Project
    // --------------------------------------------------------

    if (
      projectId !== undefined &&
      String(projectId) !==
        String(task.projectId)
    ) {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      const project =
        await getProjectForCompany(
          projectId,
          companyId
        );

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      task.projectId = projectId;
    }

    // --------------------------------------------------------
    // Branch
    // --------------------------------------------------------

    if (branchId !== undefined) {
      if (branchId === null || branchId === "") {
        task.branchId = null;
      } else {
        if (!isValidObjectId(branchId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid branch ID",
          });
        }

        await ensureBranchBelongsToCompany(
          branchId,
          companyId
        );

        task.branchId = branchId;
      }
    }

    // --------------------------------------------------------
    // Assigned user
    // --------------------------------------------------------

    if (assignedTo !== undefined) {
      if (
        assignedTo === null ||
        assignedTo === ""
      ) {
        task.assignedTo = null;
      } else {
        if (!isValidObjectId(assignedTo)) {
          return res.status(400).json({
            success: false,
            message: "Invalid assigned user ID",
          });
        }

        await ensureUserBelongsToCompany(
          assignedTo,
          companyId
        );

        task.assignedTo = assignedTo;
      }
    }

    // --------------------------------------------------------
    // Task number
    // --------------------------------------------------------

    if (taskNumber !== undefined) {
      const normalizedTaskNumber = String(
        taskNumber
      )
        .trim()
        .toUpperCase();

      if (!normalizedTaskNumber) {
        return res.status(400).json({
          success: false,
          message: "Task number cannot be empty",
        });
      }

      if (
        normalizedTaskNumber !== task.taskNumber
      ) {
        const duplicate = await Task.findOne({
          _id: { $ne: task._id },
          companyId,
          taskNumber: normalizedTaskNumber,
          deletedAt: null,
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "Task number already exists",
          });
        }
      }

      task.taskNumber =
        normalizedTaskNumber;
    }

    // --------------------------------------------------------
    // Basic fields
    // --------------------------------------------------------

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Task title is required",
        });
      }

      task.title = String(title).trim();
    }

    if (description !== undefined) {
      task.description =
        String(description).trim();
    }

    if (notes !== undefined) {
      task.notes = String(notes).trim();
    }

    // --------------------------------------------------------
    // Priority
    // --------------------------------------------------------

    if (priority !== undefined) {
      const allowedPriorities = [
        "low",
        "medium",
        "high",
        "urgent",
      ];

      if (
        !allowedPriorities.includes(priority)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      task.priority = priority;
    }

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------

    if (status !== undefined) {
      const allowedStatuses = [
        "todo",
        "in_progress",
        "review",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }

      task.status = status;
    }

    // --------------------------------------------------------
    // Dates
    // --------------------------------------------------------

    const nextStartDate =
      startDate !== undefined
        ? startDate
        : task.startDate;

    const nextDueDate =
      dueDate !== undefined
        ? dueDate
        : task.dueDate;

    try {
      validateDateRange(
        nextStartDate,
        nextDueDate
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (startDate !== undefined) {
      task.startDate =
        startDate || null;
    }

    if (dueDate !== undefined) {
      task.dueDate =
        dueDate || null;
    }

    // --------------------------------------------------------
    // Hours
    // --------------------------------------------------------

    if (estimatedHours !== undefined) {
      const value = normalizeNumber(
        estimatedHours,
        0
      );

      if (value < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Estimated hours cannot be negative",
        });
      }

      task.estimatedHours = value;
    }

    if (actualHours !== undefined) {
      const value = normalizeNumber(
        actualHours,
        0
      );

      if (value < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Actual hours cannot be negative",
        });
      }

      task.actualHours = value;
    }

    // --------------------------------------------------------
    // Progress
    // --------------------------------------------------------

    if (progress !== undefined) {
      try {
        task.progress =
          validateProgress(progress);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    // Automatically sync status with progress
    if (
      task.progress === 100 &&
      task.status !== "cancelled"
    ) {
      task.status = "completed";
    }

    if (
      task.status === "completed" &&
      task.progress < 100
    ) {
      task.progress = 100;
    }

    if (
      task.status === "todo" &&
      task.progress > 0
    ) {
      task.status = "in_progress";
    }

    // --------------------------------------------------------
    // Tags
    // --------------------------------------------------------

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          message: "Tags must be an array",
        });
      }

      task.tags = tags
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }

    task.updatedBy = req.userId || null;

    await task.save();

    // --------------------------------------------------------
    // Sync project progress
    // --------------------------------------------------------

    const projectProgress =
      await syncProjectAfterTaskChange(
        task.projectId,
        companyId
      );

    const populatedTask = await Task.findOne({
      _id: task._id,
      companyId,
    })
      .populate(
        "projectId",
        "projectNumber name status progress"
      )
      .populate(
        "assignedTo",
        "name email"
      )
      .populate(
        "branchId",
        "name code"
      )
      .lean();

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: populatedTask,
      projectProgress,
    });
  } catch (error) {
    console.error("updateTask error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Task number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
};

// ============================================================
// DELETE TASK - SOFT DELETE
// DELETE /api/projects/tasks/:id
// ============================================================

const deleteTask = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    task.deletedAt = new Date();
    task.deletedBy = req.userId || null;
    task.updatedBy = req.userId || null;

    await task.save();

    await syncProjectAfterTaskChange(
      task.projectId,
      companyId
    );

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("deleteTask error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
};

// ============================================================
// TASK SUMMARY
// GET /api/projects/tasks/summary
// ============================================================

const getTaskSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const objectCompanyId =
      new mongoose.Types.ObjectId(companyId);

    const [
      total,
      todo,
      inProgress,
      review,
      completed,
      cancelled,
      urgent,
    ] = await Promise.all([
      Task.countDocuments({
        companyId,
        deletedAt: null,
      }),

      Task.countDocuments({
        companyId,
        status: "todo",
        deletedAt: null,
      }),

      Task.countDocuments({
        companyId,
        status: "in_progress",
        deletedAt: null,
      }),

      Task.countDocuments({
        companyId,
        status: "review",
        deletedAt: null,
      }),

      Task.countDocuments({
        companyId,
        status: "completed",
        deletedAt: null,
      }),

      Task.countDocuments({
        companyId,
        status: "cancelled",
        deletedAt: null,
      }),

      Task.countDocuments({
        companyId,
        priority: "urgent",
        deletedAt: null,
      }),
    ]);

    const aggregation =
      await Task.aggregate([
        {
          $match: {
            companyId: objectCompanyId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,

            averageProgress: {
              $avg: "$progress",
            },

            estimatedHours: {
              $sum: "$estimatedHours",
            },

            actualHours: {
              $sum: "$actualHours",
            },
          },
        },
      ]);

    const stats = aggregation[0] || {
      averageProgress: 0,
      estimatedHours: 0,
      actualHours: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        total,
        todo,
        inProgress,
        review,
        completed,
        cancelled,
        urgent,

        averageProgress: Number(
          (stats.averageProgress || 0).toFixed(2)
        ),

        estimatedHours: Number(
          (stats.estimatedHours || 0).toFixed(2)
        ),

        actualHours: Number(
          (stats.actualHours || 0).toFixed(2)
        ),
      },
    });
  } catch (error) {
    console.error("getTaskSummary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task summary",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskSummary,
};