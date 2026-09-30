const mongoose = require("mongoose");

const approvalHistorySchema = new mongoose.Schema(
  {
    stepNumber: {
      type: Number,
      required: true,
    },

    stepName: {
      type: String,
      trim: true,
      default: "",
    },

    action: {
      type: String,
      enum: [
        "submitted",
        "approved",
        "rejected",
        "cancelled",
        "skipped",
        "auto_approved",
      ],
      required: true,
    },

    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    actionAt: {
      type: Date,
      default: Date.now,
    },

    comments: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: true,
  }
);

const workflowInstanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
      index: true,
    },

    workflowNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    entityType: {
      type: String,
      required: true,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    entityNumber: {
      type: String,
      trim: true,
      default: "",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    currentStepNumber: {
      type: Number,
      default: 1,
    },

    currentStepId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    history: {
      type: [approvalHistorySchema],
      default: [],
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

workflowInstanceSchema.index({
  companyId: 1,
  entityType: 1,
  entityId: 1,
});

workflowInstanceSchema.index({
  companyId: 1,
  status: 1,
});

workflowInstanceSchema.index({
  companyId: 1,
  requestedBy: 1,
});

module.exports =
  mongoose.models.WorkflowInstance ||
  mongoose.model(
    "WorkflowInstance",
    workflowInstanceSchema
  );