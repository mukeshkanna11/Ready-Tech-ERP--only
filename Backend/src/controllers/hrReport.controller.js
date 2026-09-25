const mongoose = require("mongoose");

const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Payroll = require("../models/Payroll");
const Payslip = require("../models/Payslip");
const Performance = require("../models/Performance");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getDateRange = (
  startDate,
  endDate
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    return null;
  }

  return {
    start,
    end,
  };
};

const getMonthRange = (
  year,
  month
) => {
  const numericYear = Number(year);
  const numericMonth = Number(month);

  if (
    !Number.isInteger(numericYear) ||
    !Number.isInteger(numericMonth) ||
    numericYear < 2000 ||
    numericYear > 2100 ||
    numericMonth < 1 ||
    numericMonth > 12
  ) {
    return null;
  }

  return {
    start: new Date(
      numericYear,
      numericMonth - 1,
      1,
      0,
      0,
      0,
      0
    ),

    end: new Date(
      numericYear,
      numericMonth,
      0,
      23,
      59,
      59,
      999
    ),
  };
};

/*
 * Employee overview
 */
const employeeOverview = async (
  req,
  res,
  next
) => {
  try {
    const workspaceId =
      req.companyId;

    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
    ] = await Promise.all([
      Employee.countDocuments({
        workspaceId,
      }),

      Employee.countDocuments({
        workspaceId,
        status: "active",
      }),

      Employee.countDocuments({
        workspaceId,
        status: "inactive",
      }),
    ]);

    const employmentTypeSummary =
      await Employee.aggregate([
        {
          $match: {
            workspaceId:
              new mongoose.Types.ObjectId(
                workspaceId
              ),
          },
        },

        {
          $group: {
            _id: "$employmentType",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]);

    const genderSummary =
      await Employee.aggregate([
        {
          $match: {
            workspaceId:
              new mongoose.Types.ObjectId(
                workspaceId
              ),
          },
        },

        {
          $group: {
            _id: "$gender",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]);

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        employmentTypeSummary,
        genderSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Branch-wise employee report
 *
 * Does not assume any particular Branch fields.
 */
const branchEmployeeReport = async (
  req,
  res,
  next
) => {
  try {
    const workspaceId =
      new mongoose.Types.ObjectId(
        req.companyId
      );

    const data =
      await Employee.aggregate([
        {
          $match: {
            workspaceId,
          },
        },

        {
          $group: {
            _id: "$branchId",

            totalEmployees: {
              $sum: 1,
            },

            activeEmployees: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "active",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            inactiveEmployees: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "inactive",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },

        {
          $lookup: {
            from: "branches",
            localField: "_id",
            foreignField: "_id",
            as: "branch",
          },
        },

        {
          $unwind: {
            path: "$branch",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 0,
            branchId: "$_id",

            branchName: {
              $ifNull: [
                "$branch.name",
                "Unassigned",
              ],
            },

            totalEmployees: 1,
            activeEmployees: 1,
            inactiveEmployees: 1,
          },
        },

        {
          $sort: {
            totalEmployees: -1,
            branchName: 1,
          },
        },
      ]);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Attendance report
 */
const attendanceReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      startDate,
      endDate,
    } = req.query;

    let range;

    if (startDate || endDate) {
      range = getDateRange(
        startDate,
        endDate
      );
    } else {
      const now = new Date();

      range = {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ),

        end: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ),
      };
    }

    if (!range) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance date range",
      });
    }

    const workspaceId =
      new mongoose.Types.ObjectId(
        req.companyId
      );

    const [
      summary,
      dailySummary,
      employeeSummary,
    ] = await Promise.all([
      Attendance.aggregate([
        {
          $match: {
            workspaceId,
            date: {
              $gte: range.start,
              $lte: range.end,
            },
          },
        },

        {
          $group: {
            _id: null,

            totalRecords: {
              $sum: 1,
            },

            presentDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "present",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            absentDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "absent",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            lateDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "late",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            halfDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "half_day",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            leaveDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "leave",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            holidayDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "holiday",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            weekOffDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "week_off",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            overtimeMinutes: {
              $sum: "$overtimeMinutes",
            },

            workMinutes: {
              $sum: "$workMinutes",
            },
          },
        },
      ]),

      Attendance.aggregate([
        {
          $match: {
            workspaceId,
            date: {
              $gte: range.start,
              $lte: range.end,
            },
          },
        },

        {
          $group: {
            _id: "$date",

            total: {
              $sum: 1,
            },

            present: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "present",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            absent: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "absent",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            late: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "late",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            halfDay: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "half_day",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      Attendance.aggregate([
        {
          $match: {
            workspaceId,
            date: {
              $gte: range.start,
              $lte: range.end,
            },
          },
        },

        {
          $group: {
            _id: "$employeeId",

            totalRecords: {
              $sum: 1,
            },

            presentDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "present",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            absentDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "absent",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            lateDays: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "late",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            overtimeMinutes: {
              $sum: "$overtimeMinutes",
            },
          },
        },

        {
          $lookup: {
            from: "employees",
            localField: "_id",
            foreignField: "_id",
            as: "employee",
          },
        },

        {
          $unwind: {
            path: "$employee",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 0,

            employeeId: "$_id",

            employeeCode:
              "$employee.employeeCode",

            totalRecords: 1,
            presentDays: 1,
            absentDays: 1,
            lateDays: 1,
            overtimeMinutes: 1,
          },
        },

        {
          $sort: {
            absentDays: -1,
            lateDays: -1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        range,
        summary:
          summary[0] || {
            totalRecords: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            halfDays: 0,
            leaveDays: 0,
            holidayDays: 0,
            weekOffDays: 0,
            overtimeMinutes: 0,
            workMinutes: 0,
          },
        dailySummary,
        employeeSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Leave report
 */
const leaveReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      startDate,
      endDate,
      status,
    } = req.query;

    let range;

    if (startDate || endDate) {
      range = getDateRange(
        startDate,
        endDate
      );
    } else {
      const now = new Date();

      range = {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ),

        end: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ),
      };
    }

    if (!range) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid leave date range",
      });
    }

    const match = {
      workspaceId:
        new mongoose.Types.ObjectId(
          req.companyId
        ),

      $or: [
        {
          startDate: {
            $gte: range.start,
            $lte: range.end,
          },
        },

        {
          endDate: {
            $gte: range.start,
            $lte: range.end,
          },
        },

        {
          startDate: {
            $lte: range.start,
          },

          endDate: {
            $gte: range.end,
          },
        },
      ],
    };

    if (status) {
      match.status = status;
    }

    const [
      summary,
      typeSummary,
      statusSummary,
      employeeSummary,
    ] = await Promise.all([
      Leave.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: null,

            totalRequests: {
              $sum: 1,
            },

            totalDays: {
              $sum: "$totalDays",
            },
          },
        },
      ]),

      Leave.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: "$leaveType",

            requests: {
              $sum: 1,
            },

            days: {
              $sum: "$totalDays",
            },
          },
        },

        {
          $sort: {
            days: -1,
          },
        },
      ]),

      Leave.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: "$status",

            requests: {
              $sum: 1,
            },

            days: {
              $sum: "$totalDays",
            },
          },
        },

        {
          $sort: {
            requests: -1,
          },
        },
      ]),

      Leave.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: "$employeeId",

            requests: {
              $sum: 1,
            },

            totalDays: {
              $sum: "$totalDays",
            },
          },
        },

        {
          $lookup: {
            from: "employees",
            localField: "_id",
            foreignField: "_id",
            as: "employee",
          },
        },

        {
          $unwind: {
            path: "$employee",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 0,

            employeeId: "$_id",

            employeeCode:
              "$employee.employeeCode",

            requests: 1,
            totalDays: 1,
          },
        },

        {
          $sort: {
            totalDays: -1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        range,
        summary:
          summary[0] || {
            totalRequests: 0,
            totalDays: 0,
          },
        typeSummary,
        statusSummary,
        employeeSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Payroll report
 */
const payrollReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      year,
      month,
      status,
    } = req.query;

    const filter = {
      workspaceId: req.companyId,
    };

    if (year) {
      filter.year = Number(year);
    }

    if (month) {
      filter.month = Number(month);
    }

    if (status) {
      filter.status = status;
    }

    const [
      summary,
      statusSummary,
      monthlySummary,
    ] = await Promise.all([
      Payroll.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalPayrolls: {
              $sum: 1,
            },

            grossSalary: {
              $sum: "$grossSalary",
            },

            deductions: {
              $sum: "$deductions",
            },

            tax: {
              $sum: "$tax",
            },

            otherDeductions: {
              $sum: "$otherDeductions",
            },

            netSalary: {
              $sum: "$netSalary",
            },

            overtimeAmount: {
              $sum: "$overtimeAmount",
            },

            bonus: {
              $sum: "$bonus",
            },
          },
        },
      ]),

      Payroll.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            count: {
              $sum: 1,
            },

            netSalary: {
              $sum: "$netSalary",
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Payroll.aggregate([
        {
          $match: {
            workspaceId:
              new mongoose.Types.ObjectId(
                req.companyId
              ),
          },
        },

        {
          $group: {
            _id: {
              year: "$year",
              month: "$month",
            },

            payrolls: {
              $sum: 1,
            },

            grossSalary: {
              $sum: "$grossSalary",
            },

            netSalary: {
              $sum: "$netSalary",
            },

            deductions: {
              $sum: "$deductions",
            },
          },
        },

        {
          $sort: {
            "_id.year": -1,
            "_id.month": -1,
          },
        },

        {
          $limit: 24,
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary:
          summary[0] || {
            totalPayrolls: 0,
            grossSalary: 0,
            deductions: 0,
            tax: 0,
            otherDeductions: 0,
            netSalary: 0,
            overtimeAmount: 0,
            bonus: 0,
          },

        statusSummary,
        monthlySummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Payslip report
 */
const payslipReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      year,
      month,
    } = req.query;

    const filter = {
      workspaceId: req.companyId,
    };

    if (year) {
      filter.year = Number(year);
    }

    if (month) {
      filter.month = Number(month);
    }

    const [
      totalPayslips,
      totalNetSalary,
      totalGrossSalary,
    ] = await Promise.all([
      Payslip.countDocuments(filter),

      Payslip.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$netSalary",
            },
          },
        },
      ]),

      Payslip.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$grossSalary",
            },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalPayslips,
        totalNetSalary:
          totalNetSalary[0]?.total || 0,
        totalGrossSalary:
          totalGrossSalary[0]?.total || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Performance report
 */
const performanceReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      year,
      status,
      reviewType,
    } = req.query;

    const filter = {
      workspaceId:
        new mongoose.Types.ObjectId(
          req.companyId
        ),
    };

    if (year) {
      const numericYear =
        Number(year);

      if (
        Number.isInteger(
          numericYear
        )
      ) {
        filter.reviewPeriodStart = {
          $gte: new Date(
            `${numericYear}-01-01T00:00:00.000Z`
          ),

          $lt: new Date(
            `${numericYear + 1}-01-01T00:00:00.000Z`
          ),
        };
      }
    }

    if (status) {
      filter.status = status;
    }

    if (reviewType) {
      filter.reviewType =
        reviewType;
    }

    const [
      summary,
      ratingSummary,
      statusSummary,
    ] = await Promise.all([
      Performance.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalReviews: {
              $sum: 1,
            },

            averageRating: {
              $avg: "$overallRating",
            },

            ratedReviews: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      "$overallRating",
                      null,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      Performance.aggregate([
        {
          $match: {
            ...filter,
            overallRating: {
              $ne: null,
            },
          },
        },

        {
          $group: {
            _id:
              "$overallRating",

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      Performance.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary:
          summary[0] || {
            totalReviews: 0,
            averageRating: null,
            ratedReviews: 0,
          },

        ratingSummary,
        statusSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Complete HR dashboard
 *
 * This endpoint combines the most
 * important HR metrics into one API.
 */
const dashboard = async (
  req,
  res,
  next
) => {
  try {
    const workspaceId =
      new mongoose.Types.ObjectId(
        req.companyId
      );

    const now = new Date();

    const monthRange = {
      start: new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ),

      end: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ),
    };

    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [
      employeeStats,
      attendanceStats,
      leaveStats,
      payrollStats,
      performanceStats,
    ] = await Promise.all([
      Employee.aggregate([
        {
          $match: {
            workspaceId,
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: 1,
            },

            active: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "active",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            inactive: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "inactive",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      Attendance.aggregate([
        {
          $match: {
            workspaceId,

            date: {
              $gte: monthRange.start,
              $lte: monthRange.end,
            },
          },
        },

        {
          $group: {
            _id: null,

            present: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        "present",
                        "late",
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            absent: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "absent",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            late: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "late",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            leave: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "leave",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            overtimeMinutes: {
              $sum: "$overtimeMinutes",
            },
          },
        },
      ]),

      Leave.aggregate([
        {
          $match: {
            workspaceId,

            startDate: {
              $lte: monthRange.end,
            },

            endDate: {
              $gte: monthRange.start,
            },
          },
        },

        {
          $group: {
            _id: null,

            totalRequests: {
              $sum: 1,
            },

            totalDays: {
              $sum: "$totalDays",
            },

            pending: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "pending",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            approved: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "approved",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            rejected: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "rejected",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      Payroll.aggregate([
        {
          $match: {
            workspaceId,
            year,
            month,
          },
        },

        {
          $group: {
            _id: null,

            totalPayrolls: {
              $sum: 1,
            },

            grossSalary: {
              $sum: "$grossSalary",
            },

            netSalary: {
              $sum: "$netSalary",
            },

            paidPayrolls: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "paid",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            pendingPayrolls: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        "draft",
                        "processed",
                        "approved",
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      Performance.aggregate([
        {
          $match: {
            workspaceId,
          },
        },

        {
          $group: {
            _id: null,

            totalReviews: {
              $sum: 1,
            },

            averageRating: {
              $avg: "$overallRating",
            },

            completedReviews: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        "approved",
                        "closed",
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        period: {
          year,
          month,
          startDate:
            monthRange.start,
          endDate:
            monthRange.end,
        },

        employees:
          employeeStats[0] || {
            total: 0,
            active: 0,
            inactive: 0,
          },

        attendance:
          attendanceStats[0] || {
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            overtimeMinutes: 0,
          },

        leaves:
          leaveStats[0] || {
            totalRequests: 0,
            totalDays: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
          },

        payroll:
          payrollStats[0] || {
            totalPayrolls: 0,
            grossSalary: 0,
            netSalary: 0,
            paidPayrolls: 0,
            pendingPayrolls: 0,
          },

        performance:
          performanceStats[0] || {
            totalReviews: 0,
            averageRating: null,
            completedReviews: 0,
          },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  dashboard,
  employeeOverview,
  branchEmployeeReport,
  attendanceReport,
  leaveReport,
  payrollReport,
  payslipReport,
  performanceReport,
};