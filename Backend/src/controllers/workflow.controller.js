const mongoose = require("mongoose");

const Workflow = require("../models/Workflow");
const WorkflowInstance = require("../models/WorkflowInstance");

const {
  getCompanyId,
  getUserId,
  generateWorkflowNumber,
  ensureWorkflowBelongsToCompany,
  validateSteps,
  findActiveWorkflow,
  isUserAllowedForStep,
  getCurrentStep,
} = require("../services/workflow.service");

// ============================================================
// CREATE WORKFLOW
// ============================================================

const createWorkflow = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const {
      branchId = null,
      name,
      description = "",
      entityType,
      triggerType = "manual",
      steps,
      allowParallelApproval = false,
      autoStart = false,
      priority = 0,
      status = "draft",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Workflow name is required",
      });
    }

    if (!entityType) {
      return res.status(400).json({
        success: false,
        message: "Entity type is required",
      });
    }

    const normalizedSteps = await validateSteps(
      steps,
      companyId
    );

    const workflowNumber =
      await generateWorkflowNumber(companyId);

    const workflow = await Workflow.create({
      companyId,
      branchId: branchId || null,
      workflowNumber,
      name: name.trim(),
      description: description?.trim() || "",
      entityType,
      triggerType,
      steps: normalizedSteps,
      allowParallelApproval:
        allowParallelApproval === true,
      autoStart: autoStart === true,
      priority: Number(priority) || 0,
      status,
      createdBy: userId,
      updatedBy: userId,
    });

    const populated = await Workflow.findById(
      workflow._id
    )
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("steps.approverUserId", "name email")
      .populate("steps.approverRoleId", "name");

    return res.status(201).json({
      success: true,
      message: "Workflow created successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "createWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create workflow",
    });
  }
};

// ============================================================
// GET WORKFLOWS
// ============================================================

const getWorkflows = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const {
      search = "",
      entityType,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const pageLimit = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {
      companyId,
      deletedAt: null,
    };

    if (entityType) {
      filter.entityType = entityType;
    }

    if (status) {
      filter.status = status;
    }

    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          workflowNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (currentPage - 1) * pageLimit;

    const [workflows, total] =
      await Promise.all([
        Workflow.find(filter)
          .populate(
            "createdBy",
            "name email"
          )
          .populate(
            "updatedBy",
            "name email"
          )
          .sort({
            priority: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(pageLimit)
          .lean(),

        Workflow.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      data: workflows,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(
          total / pageLimit
        ),
      },
    });
  } catch (error) {
    console.error(
      "getWorkflows:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch workflows",
    });
  }
};

// ============================================================
// GET WORKFLOW BY ID
// ============================================================

const getWorkflowById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow ID",
      });
    }

    const workflow = await Workflow.findOne({
      _id: req.params.id,
      companyId,
      deletedAt: null,
    })
      .populate(
        "createdBy",
        "name email"
      )
      .populate(
        "updatedBy",
        "name email"
      )
      .populate(
        "steps.approverUserId",
        "name email"
      )
      .populate(
        "steps.approverRoleId",
        "name"
      );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    return res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error(
      "getWorkflowById:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch workflow",
    });
  }
};

// ============================================================
// UPDATE WORKFLOW
// ============================================================

const updateWorkflow = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const workflow =
      await ensureWorkflowBelongsToCompany(
        req.params.id,
        companyId
      );

    if (
      workflow.status === "active" &&
      req.body.steps
    ) {
      // Steps can still be changed,
      // but validate them completely.
    }

    if (req.body.steps) {
      workflow.steps =
        await validateSteps(
          req.body.steps,
          companyId
        );
    }

    const allowedFields = [
      "branchId",
      "name",
      "description",
      "entityType",
      "triggerType",
      "allowParallelApproval",
      "autoStart",
      "priority",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (
        req.body[field] !== undefined
      ) {
        workflow[field] =
          req.body[field];
      }
    });

    workflow.updatedBy = userId;

    await workflow.save();

    const populated =
      await Workflow.findById(
        workflow._id
      )
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .populate(
          "steps.approverUserId",
          "name email"
        )
        .populate(
          "steps.approverRoleId",
          "name"
        );

    return res.json({
      success: true,
      message: "Workflow updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "updateWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update workflow",
    });
  }
};

// ============================================================
// DELETE WORKFLOW
// ============================================================

const deleteWorkflow = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const workflow =
      await ensureWorkflowBelongsToCompany(
        req.params.id,
        companyId
      );

    workflow.deletedAt = new Date();
    workflow.deletedBy = userId;
    workflow.status = "inactive";

    await workflow.save();

    return res.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error(
      "deleteWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete workflow",
    });
  }
};

// ============================================================
// RESTORE WORKFLOW
// ============================================================

const restoreWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow ID",
      });
    }

    const workflow =
      await Workflow.findOne({
        _id: req.params.id,
        companyId,
      });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    workflow.deletedAt = null;
    workflow.deletedBy = null;
    workflow.status = "draft";

    await workflow.save();

    return res.json({
      success: true,
      message: "Workflow restored successfully",
      data: workflow,
    });
  } catch (error) {
    console.error(
      "restoreWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to restore workflow",
    });
  }
};

// ============================================================
// ACTIVATE WORKFLOW
// ============================================================

const activateWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const workflow =
      await ensureWorkflowBelongsToCompany(
        req.params.id,
        companyId
      );

    if (
      !workflow.steps ||
      workflow.steps.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Workflow must have at least one step",
      });
    }

    workflow.status = "active";
    workflow.updatedBy = userId;

    await workflow.save();

    return res.json({
      success: true,
      message: "Workflow activated successfully",
      data: workflow,
    });
  } catch (error) {
    console.error(
      "activateWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to activate workflow",
    });
  }
};

// ============================================================
// DEACTIVATE WORKFLOW
// ============================================================

const deactivateWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const workflow =
      await ensureWorkflowBelongsToCompany(
        req.params.id,
        companyId
      );

    workflow.status = "inactive";
    workflow.updatedBy = userId;

    await workflow.save();

    return res.json({
      success: true,
      message: "Workflow deactivated successfully",
      data: workflow,
    });
  } catch (error) {
    console.error(
      "deactivateWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to deactivate workflow",
    });
  }
};

// ============================================================
// START WORKFLOW
// ============================================================

const startWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const {
      entityType,
      entityId,
      entityNumber = "",
      branchId = null,
      metadata = {},
    } = req.body;

    if (
      !entityType ||
      !entityId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "entityType and entityId are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        entityId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID",
      });
    }

    const workflow =
      await findActiveWorkflow(
        companyId,
        entityType
      );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message:
          "No active workflow found for this entity type",
      });
    }

    const existing =
      await WorkflowInstance.findOne({
        companyId,
        entityType,
        entityId,
        status: "pending",
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "An active workflow already exists for this entity",
        data: existing,
      });
    }

    const firstStep =
      getCurrentStep(
        workflow,
        1
      );

    if (!firstStep) {
      return res.status(400).json({
        success: false,
        message:
          "Workflow has no valid first step",
      });
    }

    const instance =
      await WorkflowInstance.create({
        companyId,
        branchId,
        workflowId: workflow._id,
        workflowNumber:
          workflow.workflowNumber,
        entityType,
        entityId,
        entityNumber,
        requestedBy: userId,
        currentStepNumber:
          firstStep.stepNumber,
        currentStepId:
          firstStep._id,
        status: "pending",
        startedAt: new Date(),
        metadata,
        history: [
          {
            stepNumber: firstStep.stepNumber,
            stepName: firstStep.name,
            action: "submitted",
            actionBy: userId,
            actionAt: new Date(),
          },
        ],
      });

    return res.status(201).json({
      success: true,
      message: "Workflow started successfully",
      data: instance,
    });
  } catch (error) {
    console.error(
      "startWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start workflow",
    });
  }
};

// ============================================================
// GET WORKFLOW INSTANCES
// ============================================================

const getWorkflowInstances = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);

    const {
      status,
      entityType,
      entityId,
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const pageLimit = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {
      companyId,
    };

    if (status) {
      filter.status = status;
    }

    if (entityType) {
      filter.entityType =
        entityType;
    }

    if (entityId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          entityId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid entity ID",
        });
      }

      filter.entityId = entityId;
    }

    const skip =
      (currentPage - 1) *
      pageLimit;

    const [instances, total] =
      await Promise.all([
        WorkflowInstance.find(filter)
          .populate(
            "workflowId",
            "name workflowNumber entityType"
          )
          .populate(
            "requestedBy",
            "name email"
          )
          .populate(
            "history.actionBy",
            "name email"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(pageLimit)
          .lean(),

        WorkflowInstance.countDocuments(
          filter
        ),
      ]);

    return res.json({
      success: true,
      data: instances,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(
          total / pageLimit
        ),
      },
    });
  } catch (error) {
    console.error(
      "getWorkflowInstances:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch workflow instances",
    });
  }
};

// ============================================================
// GET PENDING APPROVALS
// ============================================================

const getPendingApprovals = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const instances =
      await WorkflowInstance.find({
        companyId,
        status: "pending",
      })
        .populate(
          "workflowId"
        )
        .populate(
          "requestedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const results = [];

    for (const instance of instances) {
      const workflow =
        instance.workflowId;

      if (!workflow) continue;

      const currentStep =
        getCurrentStep(
          workflow,
          instance.currentStepNumber
        );

      if (!currentStep) continue;

      const allowed =
        await isUserAllowedForStep(
          currentStep,
          userId,
          companyId
        );

      if (allowed) {
        results.push({
          ...instance,
          currentStep,
        });
      }
    }

    return res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error(
      "getPendingApprovals:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch pending approvals",
    });
  }
};

// ============================================================
// GET INSTANCE BY ID
// ============================================================

const getWorkflowInstanceById =
  async (req, res) => {
    try {
      const companyId =
        getCompanyId(req);

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid workflow instance ID",
        });
      }

      const instance =
        await WorkflowInstance.findOne({
          _id: req.params.id,
          companyId,
        })
          .populate(
            "workflowId"
          )
          .populate(
            "requestedBy",
            "name email"
          )
          .populate(
            "history.actionBy",
            "name email"
          );

      if (!instance) {
        return res.status(404).json({
          success: false,
          message:
            "Workflow instance not found",
        });
      }

      return res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      console.error(
        "getWorkflowInstanceById:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch workflow instance",
      });
    }
  };

// ============================================================
// APPROVE
// ============================================================

const approveWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const instance =
      await WorkflowInstance.findOne({
        _id: req.params.id,
        companyId,
        status: "pending",
      });

    if (!instance) {
      return res.status(404).json({
        success: false,
        message:
          "Pending workflow instance not found",
      });
    }

    const workflow =
      await Workflow.findOne({
        _id: instance.workflowId,
        companyId,
        deletedAt: null,
      });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message:
          "Workflow definition not found",
      });
    }

    const currentStep =
      getCurrentStep(
        workflow,
        instance.currentStepNumber
      );

    if (!currentStep) {
      return res.status(400).json({
        success: false,
        message:
          "Current workflow step is invalid",
      });
    }

    const allowed =
      await isUserAllowedForStep(
        currentStep,
        userId,
        companyId
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to approve this step",
      });
    }

    if (
      !currentStep.allowSelfApproval &&
      String(instance.requestedBy) ===
        String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Self approval is not allowed for this step",
      });
    }

    const comments =
      req.body?.comments || "";

    instance.history.push({
      stepNumber:
        currentStep.stepNumber,
      stepName:
        currentStep.name,
      action: "approved",
      actionBy: userId,
      actionAt: new Date(),
      comments,
    });

    const nextStep =
      getCurrentStep(
        workflow,
        currentStep.stepNumber + 1
      );

    if (!nextStep) {
      instance.status = "approved";
      instance.completedAt =
        new Date();
      instance.currentStepId = null;
    } else {
      instance.currentStepNumber =
        nextStep.stepNumber;

      instance.currentStepId =
        nextStep._id;
    }

    await instance.save();

    return res.json({
      success: true,
      message: nextStep
        ? "Workflow step approved"
        : "Workflow approved successfully",
      data: instance,
    });
  } catch (error) {
    console.error(
      "approveWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to approve workflow",
    });
  }
};

// ============================================================
// REJECT
// ============================================================

const rejectWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const instance =
      await WorkflowInstance.findOne({
        _id: req.params.id,
        companyId,
        status: "pending",
      });

    if (!instance) {
      return res.status(404).json({
        success: false,
        message:
          "Pending workflow instance not found",
      });
    }

    const workflow =
      await Workflow.findOne({
        _id: instance.workflowId,
        companyId,
        deletedAt: null,
      });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message:
          "Workflow definition not found",
      });
    }

    const currentStep =
      getCurrentStep(
        workflow,
        instance.currentStepNumber
      );

    const allowed =
      await isUserAllowedForStep(
        currentStep,
        userId,
        companyId
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to reject this step",
      });
    }

    const comments =
      req.body?.comments || "";

    instance.status = "rejected";
    instance.completedAt =
      new Date();

    instance.history.push({
      stepNumber:
        currentStep.stepNumber,
      stepName:
        currentStep.name,
      action: "rejected",
      actionBy: userId,
      actionAt: new Date(),
      comments,
    });

    await instance.save();

    return res.json({
      success: true,
      message: "Workflow rejected successfully",
      data: instance,
    });
  } catch (error) {
    console.error(
      "rejectWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to reject workflow",
    });
  }
};

// ============================================================
// CANCEL
// ============================================================

const cancelWorkflow = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const instance =
      await WorkflowInstance.findOne({
        _id: req.params.id,
        companyId,
        status: "pending",
      });

    if (!instance) {
      return res.status(404).json({
        success: false,
        message:
          "Pending workflow instance not found",
      });
    }

    const comments =
      req.body?.comments || "";

    instance.status = "cancelled";
    instance.completedAt =
      new Date();

    instance.history.push({
      stepNumber:
        instance.currentStepNumber,
      stepName: "Workflow",
      action: "cancelled",
      actionBy: userId,
      actionAt: new Date(),
      comments,
    });

    await instance.save();

    return res.json({
      success: true,
      message: "Workflow cancelled successfully",
      data: instance,
    });
  } catch (error) {
    console.error(
      "cancelWorkflow:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel workflow",
    });
  }
};

// ============================================================
// SUMMARY
// ============================================================

const getWorkflowSummary = async (
  req,
  res
) => {
  try {
    const companyId = getCompanyId(req);

    const [
      totalWorkflows,
      activeWorkflows,
      draftWorkflows,
      inactiveWorkflows,
      pendingInstances,
      approvedInstances,
      rejectedInstances,
      cancelledInstances,
    ] = await Promise.all([
      Workflow.countDocuments({
        companyId,
        deletedAt: null,
      }),

      Workflow.countDocuments({
        companyId,
        status: "active",
        deletedAt: null,
      }),

      Workflow.countDocuments({
        companyId,
        status: "draft",
        deletedAt: null,
      }),

      Workflow.countDocuments({
        companyId,
        status: "inactive",
        deletedAt: null,
      }),

      WorkflowInstance.countDocuments({
        companyId,
        status: "pending",
      }),

      WorkflowInstance.countDocuments({
        companyId,
        status: "approved",
      }),

      WorkflowInstance.countDocuments({
        companyId,
        status: "rejected",
      }),

      WorkflowInstance.countDocuments({
        companyId,
        status: "cancelled",
      }),
    ]);

    return res.json({
      success: true,
      data: {
        workflows: {
          total: totalWorkflows,
          active: activeWorkflows,
          draft: draftWorkflows,
          inactive: inactiveWorkflows,
        },

        instances: {
          pending: pendingInstances,
          approved: approvedInstances,
          rejected: rejectedInstances,
          cancelled: cancelledInstances,
        },
      },
    });
  } catch (error) {
    console.error(
      "getWorkflowSummary:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch workflow summary",
    });
  }
};

module.exports = {
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
};