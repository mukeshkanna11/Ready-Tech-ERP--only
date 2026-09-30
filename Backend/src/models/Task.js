const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    taskNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "todo",
        "in_progress",
        "review",
        "completed",
        "cancelled",
      ],
      default: "todo",
      index: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    estimatedHours: {
      type: Number,
      min: 0,
      default: 0,
    },

    actualHours: {
      type: Number,
      min: 0,
      default: 0,
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

taskSchema.index(
  { companyId: 1, taskNumber: 1 },
  { unique: true }
);

taskSchema.index({
  companyId: 1,
  projectId: 1,
  status: 1,
});

module.exports =
  mongoose.models.Task ||
  mongoose.model("Task", taskSchema);