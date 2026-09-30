const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
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

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    projectNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    projectCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
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

    projectManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    teamMemberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    budget: {
      type: Number,
      min: 0,
      default: 0,
    },

    actualCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    revenue: {
      type: Number,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    status: {
      type: String,
      enum: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      default: "planning",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index(
  { companyId: 1, projectNumber: 1 },
  { unique: true }
);

projectSchema.index({
  companyId: 1,
  name: 1,
});

projectSchema.index({
  companyId: 1,
  status: 1,
});

projectSchema.index({
  companyId: 1,
  customerId: 1,
});

module.exports =
  mongoose.models.Project ||
  mongoose.model("Project", projectSchema);