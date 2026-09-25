const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Shift name is required"],
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: [true, "Shift code is required"],
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time"],
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time"],
    },

    breakMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    graceMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    workingMinutes: {
      type: Number,
      required: [true, "Working minutes are required"],
      min: 0,
    },

    shiftType: {
      type: String,
      enum: [
        "regular",
        "night",
        "flexible",
        "rotational",
      ],
      default: "regular",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

shiftSchema.index(
  {
    workspaceId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

shiftSchema.index({
  workspaceId: 1,
  isActive: 1,
});

shiftSchema.index({
  workspaceId: 1,
  shiftType: 1,
});

module.exports = mongoose.model("Shift", shiftSchema);