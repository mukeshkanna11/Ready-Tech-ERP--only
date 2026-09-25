const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    payslipNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
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

    payrollStatus: {
      type: String,
      enum: [
        "draft",
        "processed",
        "approved",
        "paid",
        "cancelled",
      ],
      required: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
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
 * One payslip per payroll.
 */
payslipSchema.index(
  {
    workspaceId: 1,
    payrollId: 1,
  },
  {
    unique: true,
  }
);

/*
 * One payslip number per workspace.
 */
payslipSchema.index(
  {
    workspaceId: 1,
    payslipNumber: 1,
  },
  {
    unique: true,
  }
);

payslipSchema.index({
  workspaceId: 1,
  employeeId: 1,
  year: 1,
  month: -1,
});

payslipSchema.index({
  workspaceId: 1,
  year: 1,
  month: 1,
});

module.exports = mongoose.model(
  "Payslip",
  payslipSchema
);