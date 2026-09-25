const mongoose = require("mongoose");

const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

const getMonthPeriod = (year, month) => {
  const start = new Date(
    Date.UTC(year, month - 1, 1)
  );

  const end = new Date(
    Date.UTC(year, month, 0)
  );

  end.setUTCHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
};

const getWorkingDays = (year, month) => {
  const daysInMonth = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    const dayOfWeek = date.getUTCDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays += 1;
    }
  }

  return workingDays;
};

const calculateAttendanceSummary = async ({
  workspaceId,
  employeeId,
  start,
  end,
}) => {
  const records = await Attendance.find({
    workspaceId,
    employeeId,
    date: {
      $gte: start,
      $lte: end,
    },
  })
    .select(
      "date status workMinutes overtimeMinutes lateMinutes"
    )
    .lean();

  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let lateDays = 0;
  let overtimeMinutes = 0;

  for (const record of records) {
    switch (record.status) {
      case "present":
        presentDays += 1;
        break;

      case "late":
        presentDays += 1;
        lateDays += 1;
        break;

      case "half_day":
        halfDays += 1;
        break;

      case "absent":
        absentDays += 1;
        break;

      case "leave":
        leaveDays += 1;
        break;

      default:
        break;
    }

    overtimeMinutes += Number(
      record.overtimeMinutes || 0
    );
  }

  return {
    presentDays,
    absentDays,
    leaveDays,
    halfDays,
    lateDays,
    overtimeMinutes,
  };
};

const calculateApprovedLeaveDays = async ({
  workspaceId,
  employeeId,
  start,
  end,
}) => {
  const leaves = await Leave.find({
    workspaceId,
    employeeId,
    status: "approved",
    startDate: {
      $lte: end,
    },
    endDate: {
      $gte: start,
    },
  })
    .select("startDate endDate totalDays")
    .lean();

  let totalDays = 0;

  for (const leave of leaves) {
    const leaveStart =
      leave.startDate < start
        ? start
        : leave.startDate;

    const leaveEnd =
      leave.endDate > end
        ? end
        : leave.endDate;

    const millisecondsPerDay =
      24 * 60 * 60 * 1000;

    const days =
      Math.floor(
        (leaveEnd.getTime() -
          leaveStart.getTime()) /
          millisecondsPerDay
      ) + 1;

    totalDays += Math.max(days, 0);
  }

  return totalDays;
};

const calculateSalary = ({
  basicSalary,
  allowances,
  overtimeAmount,
  bonus,
  deductions,
  tax,
  otherDeductions,
}) => {
  const basic = roundMoney(basicSalary);
  const allowanceAmount = roundMoney(allowances);
  const overtime = roundMoney(overtimeAmount);
  const bonusAmount = roundMoney(bonus);

  const deductionAmount = roundMoney(deductions);
  const taxAmount = roundMoney(tax);
  const otherDeductionAmount =
    roundMoney(otherDeductions);

  const grossSalary = roundMoney(
    basic +
      allowanceAmount +
      overtime +
      bonusAmount
  );

  const totalDeductions = roundMoney(
    deductionAmount +
      taxAmount +
      otherDeductionAmount
  );

  const netSalary = Math.max(
    roundMoney(grossSalary - totalDeductions),
    0
  );

  return {
    grossSalary,
    netSalary,
  };
};

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId,
      month,
      year,
      status,
      search = "",
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {
      workspaceId: req.companyId,
    };

    if (employeeId) {
      if (!isValidObjectId(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      filter.employeeId = employeeId;
    }

    if (month) {
      const numericMonth = Number(month);

      if (
        !Number.isInteger(numericMonth) ||
        numericMonth < 1 ||
        numericMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid month",
        });
      }

      filter.month = numericMonth;
    }

    if (year) {
      const numericYear = Number(year);

      if (
        !Number.isInteger(numericYear) ||
        numericYear < 2000 ||
        numericYear > 2100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
        });
      }

      filter.year = numericYear;
    }

    if (status) {
      filter.status = status;
    }

    if (search.trim()) {
      const employees = await Employee.find({
        workspaceId: req.companyId,
        employeeCode: {
          $regex: search.trim(),
          $options: "i",
        },
      })
        .select("_id")
        .lean();

      filter.employeeId = {
        $in: employees.map(
          (employee) => employee._id
        ),
      };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter)
        .populate({
          path: "employeeId",
          select:
            "employeeCode userId branchId employmentType status",
          populate: {
            path: "userId",
            select: "name email",
          },
        })
        .populate("createdBy", "name email")
        .populate("processedBy", "name email")
        .populate("approvedBy", "name email")
        .populate("paidBy", "name email")
        .populate("updatedBy", "name email")
        .sort({
          year: -1,
          month: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Payroll.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: payrolls,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      employeeId,
      month,
      year,
      basicSalary = 0,
      allowances = 0,
      overtimeAmount = 0,
      bonus = 0,
      deductions = 0,
      tax = 0,
      otherDeductions = 0,
      notes = "",
    } = req.body;

    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Valid employee ID is required",
      });
    }

    const numericMonth = Number(month);
    const numericYear = Number(year);

    if (
      !Number.isInteger(numericMonth) ||
      numericMonth < 1 ||
      numericMonth > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid month is required",
      });
    }

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 2000 ||
      numericYear > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid year is required",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      workspaceId: req.companyId,
    }).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (employee.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Payroll cannot be created for an inactive employee",
      });
    }

    const existingPayroll =
      await Payroll.findOne({
        workspaceId: req.companyId,
        employeeId,
        month: numericMonth,
        year: numericYear,
      }).lean();

    if (existingPayroll) {
      return res.status(409).json({
        success: false,
        message:
          "Payroll already exists for this employee and month",
      });
    }

    const { start, end } = getMonthPeriod(
      numericYear,
      numericMonth
    );

    const workingDays = getWorkingDays(
      numericYear,
      numericMonth
    );

    const attendanceSummary =
      await calculateAttendanceSummary({
        workspaceId: req.companyId,
        employeeId,
        start,
        end,
      });

    const approvedLeaveDays =
      await calculateApprovedLeaveDays({
        workspaceId: req.companyId,
        employeeId,
        start,
        end,
      });

    const paidDays = Math.min(
      workingDays,
      attendanceSummary.presentDays +
        attendanceSummary.halfDays * 0.5 +
        approvedLeaveDays
    );

    const unpaidDays = Math.max(
      workingDays - paidDays,
      0
    );

    const salary = calculateSalary({
      basicSalary,
      allowances,
      overtimeAmount,
      bonus,
      deductions,
      tax,
      otherDeductions,
    });

    const payroll = await Payroll.create({
      workspaceId: req.companyId,
      employeeId,

      month: numericMonth,
      year: numericYear,

      payPeriodStart: start,
      payPeriodEnd: end,

      workingDays,
      paidDays,
      unpaidDays,

      leaveDays: approvedLeaveDays,

      presentDays:
        attendanceSummary.presentDays,

      absentDays:
        attendanceSummary.absentDays,

      halfDays:
        attendanceSummary.halfDays,

      lateDays:
        attendanceSummary.lateDays,

      overtimeMinutes:
        attendanceSummary.overtimeMinutes,

      basicSalary: roundMoney(basicSalary),
      allowances: roundMoney(allowances),
      overtimeAmount: roundMoney(overtimeAmount),
      bonus: roundMoney(bonus),

      grossSalary: salary.grossSalary,

      deductions: roundMoney(deductions),
      tax: roundMoney(tax),
      otherDeductions:
        roundMoney(otherDeductions),

      netSalary: salary.netSalary,

      notes: String(notes).trim(),

      status: "draft",
      createdBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Payroll created successfully",
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    })
      .populate({
        path: "employeeId",
        select:
          "employeeCode userId branchId employmentType status",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("createdBy", "name email")
      .populate("processedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("paidBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft payroll can be updated",
      });
    }

    const fields = [
      "basicSalary",
      "allowances",
      "overtimeAmount",
      "bonus",
      "deductions",
      "tax",
      "otherDeductions",
      "notes",
    ];

    for (const field of fields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        if (field === "notes") {
          payroll[field] = String(
            req.body[field] || ""
          ).trim();
        } else {
          payroll[field] = Math.max(
            Number(req.body[field]) || 0,
            0
          );
        }
      }
    }

    const salary = calculateSalary({
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      overtimeAmount:
        payroll.overtimeAmount,
      bonus: payroll.bonus,
      deductions: payroll.deductions,
      tax: payroll.tax,
      otherDeductions:
        payroll.otherDeductions,
    });

    payroll.grossSalary =
      salary.grossSalary;

    payroll.netSalary =
      salary.netSalary;

    payroll.updatedBy = req.userId;

    await payroll.save();

    return res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const processPayroll = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft payroll can be processed",
      });
    }

    payroll.status = "processed";
    payroll.processedAt = new Date();
    payroll.processedBy = req.userId;
    payroll.updatedBy = req.userId;

    await payroll.save();

    return res.status(200).json({
      success: true,
      message: "Payroll processed successfully",
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const approvePayroll = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (payroll.status !== "processed") {
      return res.status(400).json({
        success: false,
        message:
          "Only processed payroll can be approved",
      });
    }

    payroll.status = "approved";
    payroll.approvedAt = new Date();
    payroll.approvedBy = req.userId;
    payroll.updatedBy = req.userId;

    await payroll.save();

    return res.status(200).json({
      success: true,
      message: "Payroll approved successfully",
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const markPaid = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (payroll.status !== "approved") {
      return res.status(400).json({
        success: false,
        message:
          "Only approved payroll can be marked as paid",
      });
    }

    payroll.status = "paid";
    payroll.paidAt = new Date();
    payroll.paidBy = req.userId;
    payroll.updatedBy = req.userId;

    await payroll.save();

    return res.status(200).json({
      success: true,
      message: "Payroll marked as paid",
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const cancelPayroll = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (
      payroll.status === "paid" ||
      payroll.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This payroll cannot be cancelled",
      });
    }

    payroll.status = "cancelled";
    payroll.updatedBy = req.userId;

    await payroll.save();

    return res.status(200).json({
      success: true,
      message: "Payroll cancelled successfully",
      data: payroll,
    });
  } catch (err) {
    next(err);
  }
};

const remove = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft payroll can be deleted",
      });
    }

    await Payroll.deleteOne({
      _id: id,
      workspaceId: req.companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Payroll deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  create,
  getById,
  update,
  processPayroll,
  approvePayroll,
  markPaid,
  cancelPayroll,
  remove,
};