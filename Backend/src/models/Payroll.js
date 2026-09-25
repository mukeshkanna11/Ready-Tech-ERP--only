const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
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

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
      index: true,
    },

    payPeriodStart: {
      type: Date,
      required: true,
    },

    payPeriodEnd: {
      type: Date,
      required: true,
    },

    workingDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    unpaidDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    leaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    absentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    halfDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    basicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    netSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "processed",
        "approved",
        "paid",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
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

/*
 * One payroll record per employee per month/year.
 */
payrollSchema.index(
  {
    workspaceId: 1,
    employeeId: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

payrollSchema.index({
  workspaceId: 1,
  year: 1,
  month: 1,
  status: 1,
});

payrollSchema.index({
  workspaceId: 1,
  employeeId: 1,
  year: 1,
  month: -1,
});

module.exports = mongoose.model("Payroll", payrollSchema);