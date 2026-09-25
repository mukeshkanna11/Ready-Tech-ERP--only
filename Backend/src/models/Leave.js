const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    leaveType: {
      type: String,
      enum: [
        "casual",
        "sick",
        "annual",
        "earned",
        "unpaid",
        "maternity",
        "paternity",
        "other",
      ],
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
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

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

leaveSchema.index({
  workspaceId: 1,
  employeeId: 1,
  startDate: -1,
});

leaveSchema.index({
  workspaceId: 1,
  employeeId: 1,
  status: 1,
});

leaveSchema.index({
  workspaceId: 1,
  status: 1,
  startDate: -1,
});

leaveSchema.index({
  workspaceId: 1,
  leaveType: 1,
  startDate: -1,
});

module.exports = mongoose.model("Leave", leaveSchema);