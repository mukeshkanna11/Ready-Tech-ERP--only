const mongoose = require("mongoose");

const workflowStepSchema = new mongoose.Schema(
  {
    stepNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    approverType: {
      type: String,
      enum: ["user", "role"],
      required: true,
    },

    approverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approverRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },

    isRequired: {
      type: Boolean,
      default: true,
    },

    allowSelfApproval: {
      type: Boolean,
      default: false,
    },

    autoApprove: {
      type: Boolean,
      default: false,
    },

    timeoutHours: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const workflowSchema = new mongoose.Schema(
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

    workflowNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    entityType: {
      type: String,
      enum: [
        "purchase",
        "sales",
        "quotation",
        "sales_order",
        "invoice",
        "payment",
        "expense",
        "project",
        "task",
        "leave",
        "payroll",
        "general",
      ],
      required: true,
      index: true,
    },

    triggerType: {
      type: String,
      enum: [
        "manual",
        "on_create",
        "on_submit",
        "on_update",
      ],
      default: "manual",
    },

    steps: {
      type: [workflowStepSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
      index: true,
    },

    allowParallelApproval: {
      type: Boolean,
      default: false,
    },

    autoStart: {
      type: Boolean,
      default: false,
    },

    priority: {
      type: Number,
      min: 0,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

workflowSchema.index(
  {
    companyId: 1,
    workflowNumber: 1,
  },
  {
    unique: true,
  }
);

workflowSchema.index({
  companyId: 1,
  entityType: 1,
  status: 1,
});

workflowSchema.index({
  companyId: 1,
  name: 1,
});

module.exports =
  mongoose.models.Workflow ||
  mongoose.model("Workflow", workflowSchema);