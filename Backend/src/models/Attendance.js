const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

    date: {
      type: Date,
      required: true,
      index: true,
    },

    checkIn: {
      type: Date,
    },

    checkOut: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "present",
        "absent",
        "late",
        "half_day",
        "leave",
        "holiday",
        "week_off",
      ],
      default: "present",
      index: true,
    },

    workMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per employee per day
attendanceSchema.index(
  {
    workspaceId: 1,
    employeeId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

attendanceSchema.index({
  workspaceId: 1,
  date: -1,
});

attendanceSchema.index({
  workspaceId: 1,
  employeeId: 1,
  date: -1,
});

attendanceSchema.index({
  workspaceId: 1,
  status: 1,
  date: -1,
});

module.exports = mongoose.model("Attendance", attendanceSchema);