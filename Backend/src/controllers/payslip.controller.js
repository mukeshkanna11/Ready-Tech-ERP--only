const mongoose = require("mongoose");

const Payslip = require("../models/Payslip");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const generatePayslipNumber = async (
  workspaceId,
  year,
  month
) => {
  const prefix = `PS-${year}-${String(month).padStart(
    2,
    "0"
  )}`;

  const latestPayslip = await Payslip.findOne({
    workspaceId,
    payslipNumber: {
      $regex: `^${prefix}-`,
    },
  })
    .sort({
      payslipNumber: -1,
    })
    .select("payslipNumber")
    .lean();

  let sequence = 1;

  if (latestPayslip?.payslipNumber) {
    const parts =
      latestPayslip.payslipNumber.split("-");

    const lastSequence = Number(
      parts[parts.length - 1]
    );

    if (Number.isFinite(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(
    4,
    "0"
  )}`;
};

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId,
      month,
      year,
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

      filter.$or = [
        {
          payslipNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          employeeId: {
            $in: employees.map(
              (employee) => employee._id
            ),
          },
        },
      ];
    }

    const skip =
      (pageNumber - 1) * limitNumber;

    const [payslips, total] =
      await Promise.all([
        Payslip.find(filter)
          .populate({
            path: "employeeId",
            select:
              "employeeCode userId branchId employmentType status",
            populate: {
              path: "userId",
              select: "name email",
            },
          })
          .populate(
            "payrollId",
            "month year status grossSalary netSalary"
          )
          .populate(
            "createdBy",
            "name email"
          )
          .populate(
            "updatedBy",
            "name email"
          )
          .sort({
            year: -1,
            month: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Payslip.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: payslips,
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

const generate = async (
  req,
  res,
  next
) => {
  try {
    const { payrollId } = req.body;

    if (!isValidObjectId(payrollId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid payroll ID is required",
      });
    }

    const payroll = await Payroll.findOne({
      _id: payrollId,
      workspaceId: req.companyId,
    }).lean();

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (
      ![
        "processed",
        "approved",
        "paid",
      ].includes(payroll.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payslip can only be generated for processed, approved, or paid payroll",
      });
    }

    const employee = await Employee.findOne({
      _id: payroll.employeeId,
      workspaceId: req.companyId,
    })
      .populate(
        "userId",
        "name email"
      )
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const existingPayslip =
      await Payslip.findOne({
        workspaceId: req.companyId,
        payrollId,
      }).lean();

    if (existingPayslip) {
      return res.status(409).json({
        success: false,
        message:
          "Payslip already exists for this payroll",
        data: existingPayslip,
      });
    }

    const payslipNumber =
      await generatePayslipNumber(
        req.companyId,
        payroll.year,
        payroll.month
      );

    const payslip =
      await Payslip.create({
        workspaceId: req.companyId,

        payrollId: payroll._id,

        employeeId:
          payroll.employeeId,

        payslipNumber,

        month: payroll.month,
        year: payroll.year,

        payPeriodStart:
          payroll.payPeriodStart,

        payPeriodEnd:
          payroll.payPeriodEnd,

        workingDays:
          payroll.workingDays,

        paidDays:
          payroll.paidDays,

        unpaidDays:
          payroll.unpaidDays,

        leaveDays:
          payroll.leaveDays,

        presentDays:
          payroll.presentDays,

        absentDays:
          payroll.absentDays,

        halfDays:
          payroll.halfDays,

        lateDays:
          payroll.lateDays,

        overtimeMinutes:
          payroll.overtimeMinutes,

        basicSalary:
          payroll.basicSalary,

        allowances:
          payroll.allowances,

        overtimeAmount:
          payroll.overtimeAmount,

        bonus:
          payroll.bonus,

        grossSalary:
          payroll.grossSalary,

        deductions:
          payroll.deductions,

        tax:
          payroll.tax,

        otherDeductions:
          payroll.otherDeductions,

        netSalary:
          payroll.netSalary,

        payrollStatus:
          payroll.status,

        issuedAt: new Date(),

        createdBy:
          req.userId,
      });

    const populatedPayslip =
      await Payslip.findById(
        payslip._id
      )
        .populate({
          path: "employeeId",
          select:
            "employeeCode userId branchId employmentType status",
          populate: {
            path: "userId",
            select: "name email",
          },
        })
        .populate(
          "payrollId",
          "month year status grossSalary netSalary"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .lean();

    return res.status(201).json({
      success: true,
      message:
        "Payslip generated successfully",
      data: populatedPayslip,
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payslip ID",
      });
    }

    const payslip =
      await Payslip.findOne({
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
        .populate(
          "payrollId"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .lean();

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message:
          "Payslip not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payslip,
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
        message:
          "Invalid payslip ID",
      });
    }

    const payslip =
      await Payslip.findOne({
        _id: id,
        workspaceId: req.companyId,
      });

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message:
          "Payslip not found",
      });
    }

    await Payslip.deleteOne({
      _id: id,
      workspaceId: req.companyId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Payslip deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  generate,
  getById,
  remove,
};