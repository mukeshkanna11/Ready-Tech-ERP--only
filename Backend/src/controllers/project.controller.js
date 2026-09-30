const Project = require("../models/Project");
const Task = require("../models/Task");

const {
  isValidObjectId,
  getCompanyId,
  ensureCustomerBelongsToCompany,
  ensureBranchBelongsToCompany,
  ensureUserBelongsToCompany,
  generateProjectNumber,
  calculateProjectProgress,
} = require("../services/project.service");


// ============================================================
// CREATE PROJECT
// ============================================================

const createProject = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.userId || null;

    const {
      branchId,
      customerId,
      projectNumber,
      projectCode,
      name,
      description,
      projectManagerId,
      teamMemberIds = [],
      startDate,
      endDate,
      budget = 0,
      actualCost = 0,
      revenue = 0,
      currency = "INR",
      status = "planning",
      priority = "medium",
      progress = 0,
      tags = [],
      notes = "",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message:
            "End date cannot be earlier than start date",
        });
      }
    }

    if (Number(progress) < 0 || Number(progress) > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100",
      });
    }

    await ensureCustomerBelongsToCompany(
      customerId,
      companyId
    );

    await ensureBranchBelongsToCompany(
      branchId,
      companyId
    );

    await ensureUserBelongsToCompany(
      projectManagerId,
      companyId
    );

    const cleanTeamMembers = Array.isArray(teamMemberIds)
      ? teamMemberIds.filter(Boolean)
      : [];

    for (const memberId of cleanTeamMembers) {
      await ensureUserBelongsToCompany(
        memberId,
        companyId
      );
    }

    let finalProjectNumber =
      projectNumber?.trim().toUpperCase();

    if (finalProjectNumber) {
      const existing = await Project.findOne({
        companyId,
        projectNumber: finalProjectNumber,
        deletedAt: null,
      }).lean();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Project number already exists",
        });
      }
    } else {
      finalProjectNumber =
        await generateProjectNumber(companyId);
    }

    const project = await Project.create({
      companyId,
      branchId: branchId || null,
      customerId: customerId || null,

      projectNumber: finalProjectNumber,

      projectCode:
        projectCode?.trim().toUpperCase() || null,

      name: name.trim(),
      description: description?.trim() || "",

      projectManagerId:
        projectManagerId || null,

      teamMemberIds: cleanTeamMembers,

      startDate: startDate || null,
      endDate: endDate || null,

      budget: Number(budget) || 0,
      actualCost: Number(actualCost) || 0,
      revenue: Number(revenue) || 0,

      currency:
        currency?.trim().toUpperCase() || "INR",

      status,
      priority,
      progress: Number(progress) || 0,

      tags: Array.isArray(tags) ? tags : [],
      notes: notes?.trim() || "",

      createdBy: userId,
      updatedBy: userId,
    });

    const populated = await Project.findById(project._id)
      .populate("customerId", "name email phone")
      .populate("branchId", "name code")
      .populate(
        "projectManagerId",
        "name email"
      )
      .populate(
        "teamMemberIds",
        "name email"
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
};


// ============================================================
// GET PROJECTS
// ============================================================

const getProjects = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const {
      page = 1,
      limit = 20,
      search = "",
      status,
      priority,
      customerId,
      branchId,
      projectManagerId,
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

    const filter = {
      companyId,
      deletedAt: null,
    };

    if (search.trim()) {
      filter.$or = [
        {
          projectNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          projectCode: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          name: {
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

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (
      customerId &&
      isValidObjectId(customerId)
    ) {
      filter.customerId = customerId;
    }

    if (
      branchId &&
      isValidObjectId(branchId)
    ) {
      filter.branchId = branchId;
    }

    if (
      projectManagerId &&
      isValidObjectId(projectManagerId)
    ) {
      filter.projectManagerId = projectManagerId;
    }

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "projectNumber",
      "startDate",
      "endDate",
      "budget",
      "progress",
      "status",
      "priority",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const sort = {
      [safeSortBy]:
        sortOrder === "asc" ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      Project.find(filter)
        .populate(
          "customerId",
          "name email phone"
        )
        .populate(
          "branchId",
          "name code"
        )
        .populate(
          "projectManagerId",
          "name email"
        )
        .sort(sort)
        .skip(
          (pageNumber - 1) * limitNumber
        )
        .limit(limitNumber)
        .lean(),

      Project.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch projects",
    });
  }
};


// ============================================================
// GET PROJECT BY ID
// ============================================================

const getProjectById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    })
      .populate(
        "customerId",
        "name email phone"
      )
      .populate(
        "branchId",
        "name code"
      )
      .populate(
        "projectManagerId",
        "name email"
      )
      .populate(
        "teamMemberIds",
        "name email"
      )
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const tasks = await Task.find({
      companyId,
      projectId: id,
      deletedAt: null,
    })
      .populate(
        "assignedTo",
        "name email"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.json({
      success: true,
      data: {
        ...project,
        tasks,
      },
    });
  } catch (error) {
    console.error(
      "Get project by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch project",
    });
  }
};


// ============================================================
// UPDATE PROJECT
// ============================================================

const updateProject = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.userId || null;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const allowedFields = [
      "branchId",
      "customerId",
      "projectCode",
      "name",
      "description",
      "projectManagerId",
      "teamMemberIds",
      "startDate",
      "endDate",
      "budget",
      "actualCost",
      "revenue",
      "currency",
      "status",
      "priority",
      "progress",
      "tags",
      "notes",
    ];

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        project[field] = req.body[field];
      }
    }

    if (!project.name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (
      project.startDate &&
      project.endDate &&
      new Date(project.endDate) <
        new Date(project.startDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End date cannot be earlier than start date",
      });
    }

    if (
      Number(project.progress) < 0 ||
      Number(project.progress) > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Progress must be between 0 and 100",
      });
    }

    await ensureCustomerBelongsToCompany(
      project.customerId,
      companyId
    );

    await ensureBranchBelongsToCompany(
      project.branchId,
      companyId
    );

    await ensureUserBelongsToCompany(
      project.projectManagerId,
      companyId
    );

    const members = Array.isArray(
      project.teamMemberIds
    )
      ? project.teamMemberIds
      : [];

    for (const memberId of members) {
      await ensureUserBelongsToCompany(
        memberId,
        companyId
      );
    }

    project.updatedBy = userId;

    await project.save();

    const updated = await Project.findById(project._id)
      .populate(
        "customerId",
        "name email phone"
      )
      .populate(
        "branchId",
        "name code"
      )
      .populate(
        "projectManagerId",
        "name email"
      )
      .populate(
        "teamMemberIds",
        "name email"
      )
      .lean();

    return res.json({
      success: true,
      message: "Project updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Update project error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update project",
    });
  }
};


// ============================================================
// DELETE PROJECT
// ============================================================

const deleteProject = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.userId || null;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    project.deletedAt = new Date();
    project.deletedBy = userId;
    project.updatedBy = userId;

    await project.save();

    return res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete project error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete project",
    });
  }
};


// ============================================================
// RESTORE PROJECT
// ============================================================

const restoreProject = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.userId || null;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      companyId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    project.deletedAt = null;
    project.deletedBy = null;
    project.updatedBy = userId;

    await project.save();

    return res.json({
      success: true,
      message: "Project restored successfully",
      data: project,
    });
  } catch (error) {
    console.error(
      "Restore project error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to restore project",
    });
  }
};


// ============================================================
// PROJECT SUMMARY
// ============================================================

const getProjectSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const [
      totalProjects,
      planningProjects,
      activeProjects,
      onHoldProjects,
      completedProjects,
      cancelledProjects,
    ] = await Promise.all([
      Project.countDocuments({
        companyId,
        deletedAt: null,
      }),

      Project.countDocuments({
        companyId,
        status: "planning",
        deletedAt: null,
      }),

      Project.countDocuments({
        companyId,
        status: "active",
        deletedAt: null,
      }),

      Project.countDocuments({
        companyId,
        status: "on_hold",
        deletedAt: null,
      }),

      Project.countDocuments({
        companyId,
        status: "completed",
        deletedAt: null,
      }),

      Project.countDocuments({
        companyId,
        status: "cancelled",
        deletedAt: null,
      }),
    ]);

    const financial = await Project.aggregate([
      {
        $match: {
          companyId:
            new (require("mongoose").Types.ObjectId)(
              companyId
            ),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalBudget: {
            $sum: "$budget",
          },
          totalActualCost: {
            $sum: "$actualCost",
          },
          totalRevenue: {
            $sum: "$revenue",
          },
        },
      },
    ]);

    const taskStats = await Task.aggregate([
      {
        $match: {
          companyId:
            new (require("mongoose").Types.ObjectId)(
              companyId
            ),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const taskSummary = {
      total: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const item of taskStats) {
      taskSummary[item._id] = item.count;
      taskSummary.total += item.count;
    }

    return res.json({
      success: true,
      data: {
        projects: {
          total: totalProjects,
          planning: planningProjects,
          active: activeProjects,
          onHold: onHoldProjects,
          completed: completedProjects,
          cancelled: cancelledProjects,
        },

        financial: financial[0] || {
          totalBudget: 0,
          totalActualCost: 0,
          totalRevenue: 0,
        },

        tasks: taskSummary,
      },
    });
  } catch (error) {
    console.error(
      "Project summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch project summary",
    });
  }
};


// ============================================================
// UPDATE PROJECT PROGRESS FROM TASKS
// ============================================================

const syncProjectProgress = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.userId || null;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const progress =
      await calculateProjectProgress(
        id,
        companyId
      );

    project.progress = progress;
    project.updatedBy = userId;

    await project.save();

    return res.json({
      success: true,
      message:
        "Project progress synchronized successfully",
      data: {
        projectId: id,
        progress,
      },
    });
  } catch (error) {
    console.error(
      "Sync project progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to synchronize project progress",
    });
  }
};


module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  restoreProject,
  getProjectSummary,
  syncProjectProgress,
};