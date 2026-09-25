const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

const ALLOWED_STATUSES = [
  "present",
  "absent",
  "late",
  "half_day",
  "leave",
  "holiday",
  "week_off",
];

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const getNextDay = (date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};

const calculateMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / 60000);
};

const calculateOvertime = (workMinutes) => {
  const standardMinutes = 8 * 60;

  return Math.max(workMinutes - standardMinutes, 0);
};

const calculateLateMinutes = (checkIn) => {
  if (!checkIn) {
    return 0;
  }

  const date = new Date(checkIn);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  /*
   * Default expected check-in time:
   * 09:30 AM
   */
  const expected = new Date(date);

  expected.setHours(9, 30, 0, 0);

  if (date <= expected) {
    return 0;
  }

  return Math.floor(
    (date.getTime() - expected.getTime()) / 60000
  );
};

const validateEmployee = async (employeeId, workspaceId) => {
  if (!isValidObjectId(employeeId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid employee ID",
    };
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    workspaceId,
  })
    .populate({
      path: "userId",
      select: "name email phone role department designation status",
      populate: {
        path: "role",
        select: "name",
      },
    })
    .populate({
      path: "branchId",
      select: "name code status",
    })
    .lean();

  if (!employee) {
    return {
      valid: false,
      status: 404,
      message: "Employee not found in this workspace",
    };
  }

  if (employee.status !== "active") {
    return {
      valid: false,
      status: 400,
      message: "Attendance cannot be created for an inactive employee",
    };
  }

  return {
    valid: true,
    employee,
  };
};

/**
 * GET /api/attendance
 */
exports.list = async (req, res, next) => {
  try {
    const workspaceId = req.companyId;

    const {
      page = 1,
      limit = 20,
      employeeId,
      status,
      date,
      fromDate,
      toDate,
      month,
      search,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const query = {
      workspaceId,
    };

    if (employeeId) {
      if (!isValidObjectId(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      query.employeeId = employeeId;
    }

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      query.status = status;
    }

    if (date) {
      const normalizedDate = normalizeDate(date);

      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      query.date = {
        $gte: normalizedDate,
        $lt: getNextDay(normalizedDate),
      };
    }

    if (fromDate || toDate) {
      const dateQuery = {};

      if (fromDate) {
        const startDate = normalizeDate(fromDate);

        if (!startDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        dateQuery.$gte = startDate;
      }

      if (toDate) {
        const endDate = normalizeDate(toDate);

        if (!endDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        dateQuery.$lt = getNextDay(endDate);
      }

      query.date = dateQuery;
    }

    if (month) {
      const match = /^(\d{4})-(\d{2})$/.exec(month);

      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Month must be in YYYY-MM format",
        });
      }

      const year = Number(match[1]);
      const monthNumber = Number(match[2]);

      if (monthNumber < 1 || monthNumber > 12) {
        return res.status(400).json({
          success: false,
          message: "Invalid month",
        });
      }

      const start = new Date(year, monthNumber - 1, 1);
      const end = new Date(year, monthNumber, 1);

      query.date = {
        $gte: start,
        $lt: end,
      };
    }

    let employeeIdsFromSearch = null;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      const matchingEmployees = await Employee.find({
        workspaceId,
      })
        .populate({
          path: "userId",
          select: "name email phone",
        })
        .select("_id employeeCode userId")
        .lean();

      employeeIdsFromSearch = matchingEmployees
        .filter((employee) => {
          const name = employee.userId?.name || "";
          const email = employee.userId?.email || "";
          const phone = employee.userId?.phone || "";

          return (
            searchRegex.test(employee.employeeCode || "") ||
            searchRegex.test(name) ||
            searchRegex.test(email) ||
            searchRegex.test(phone)
          );
        })
        .map((employee) => employee._id);

      query.employeeId = {
        $in: employeeIdsFromSearch,
      };
    }

    const total = await Attendance.countDocuments(query);

    const records = await Attendance.find(query)
      .populate({
        path: "employeeId",
        select:
          "employeeCode userId branchId joiningDate employmentType status",
        populate: [
          {
            path: "userId",
            select:
              "name email phone role department designation status",
            populate: {
              path: "role",
              select: "name",
            },
          },
          {
            path: "branchId",
            select: "name code status",
          },
        ],
      })
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    return res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
        hasNextPage:
          pageNumber * limitNumber < total,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const workspaceId = req.companyId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await Attendance.findOne({
      _id: id,
      workspaceId,
    })
      .populate({
        path: "employeeId",
        select:
          "employeeCode userId branchId joiningDate employmentType status",
        populate: [
          {
            path: "userId",
            select:
              "name email phone role department designation status",
            populate: {
              path: "role",
              select: "name",
            },
          },
          {
            path: "branchId",
            select: "name code status",
          },
        ],
      })
      .lean();

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    return res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance
 */
exports.create = async (req, res, next) => {
  try {
    const workspaceId = req.companyId;

    const {
      employeeId,
      date,
      checkIn,
      checkOut,
      status = "present",
      overtimeMinutes,
      lateMinutes,
      notes,
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Attendance date is required",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }

    const normalizedDate = normalizeDate(date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    const employeeResult = await validateEmployee(
      employeeId,
      workspaceId
    );

    if (!employeeResult.valid) {
      return res.status(employeeResult.status).json({
        success: false,
        message: employeeResult.message,
      });
    }

    const existing = await Attendance.findOne({
      workspaceId,
      employeeId,
      date: {
        $gte: normalizedDate,
        $lt: getNextDay(normalizedDate),
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance already exists for this employee on this date",
      });
    }

    let parsedCheckIn = null;
    let parsedCheckOut = null;

    if (checkIn) {
      parsedCheckIn = new Date(checkIn);

      if (Number.isNaN(parsedCheckIn.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid check-in time",
        });
      }
    }

    if (checkOut) {
      parsedCheckOut = new Date(checkOut);

      if (Number.isNaN(parsedCheckOut.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid check-out time",
        });
      }
    }

    if (
      parsedCheckIn &&
      parsedCheckOut &&
      parsedCheckOut <= parsedCheckIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Check-out time must be after check-in time",
      });
    }

    const workMinutes = calculateMinutes(
      parsedCheckIn,
      parsedCheckOut
    );

    const calculatedOvertime = calculateOvertime(workMinutes);
    const calculatedLate = calculateLateMinutes(parsedCheckIn);

    const attendance = await Attendance.create({
      workspaceId,
      employeeId,
      date: normalizedDate,
      checkIn: parsedCheckIn,
      checkOut: parsedCheckOut,
      status,
      workMinutes,
      overtimeMinutes:
        overtimeMinutes !== undefined
          ? Math.max(Number(overtimeMinutes) || 0, 0)
          : calculatedOvertime,
      lateMinutes:
        lateMinutes !== undefined
          ? Math.max(Number(lateMinutes) || 0, 0)
          : calculatedLate,
      notes,
    });

    const populatedAttendance =
      await Attendance.findOne({
        _id: attendance._id,
        workspaceId,
      })
        .populate({
          path: "employeeId",
          select:
            "employeeCode userId branchId joiningDate employmentType status",
          populate: [
            {
              path: "userId",
              select:
                "name email phone role department designation status",
              populate: {
                path: "role",
                select: "name",
              },
            },
            {
              path: "branchId",
              select: "name code status",
            },
          ],
        })
        .lean();

    return res.status(201).json({
      success: true,
      message: "Attendance created successfully",
      data: populatedAttendance,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance already exists for this employee on this date",
      });
    }

    next(error);
  }
};

/**
 * PUT /api/attendance/:id
 */
exports.update = async (req, res, next) => {
  try {
    const workspaceId = req.companyId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await Attendance.findOne({
      _id: id,
      workspaceId,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const {
      employeeId,
      date,
      checkIn,
      checkOut,
      status,
      overtimeMinutes,
      lateMinutes,
      notes,
    } = req.body;

    if (employeeId !== undefined) {
      const employeeResult = await validateEmployee(
        employeeId,
        workspaceId
      );

      if (!employeeResult.valid) {
        return res.status(employeeResult.status).json({
          success: false,
          message: employeeResult.message,
        });
      }

      attendance.employeeId = employeeId;
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      attendance.status = status;
    }

    if (date !== undefined) {
      const normalizedDate = normalizeDate(date);

      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance date",
        });
      }

      attendance.date = normalizedDate;
    }

    if (checkIn !== undefined) {
      if (!checkIn) {
        attendance.checkIn = null;
      } else {
        const parsedCheckIn = new Date(checkIn);

        if (Number.isNaN(parsedCheckIn.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid check-in time",
          });
        }

        attendance.checkIn = parsedCheckIn;
      }
    }

    if (checkOut !== undefined) {
      if (!checkOut) {
        attendance.checkOut = null;
      } else {
        const parsedCheckOut = new Date(checkOut);

        if (Number.isNaN(parsedCheckOut.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid check-out time",
          });
        }

        attendance.checkOut = parsedCheckOut;
      }
    }

    if (
      attendance.checkIn &&
      attendance.checkOut &&
      attendance.checkOut <= attendance.checkIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Check-out time must be after check-in time",
      });
    }

    attendance.workMinutes = calculateMinutes(
      attendance.checkIn,
      attendance.checkOut
    );

    if (overtimeMinutes !== undefined) {
      attendance.overtimeMinutes = Math.max(
        Number(overtimeMinutes) || 0,
        0
      );
    } else {
      attendance.overtimeMinutes = calculateOvertime(
        attendance.workMinutes
      );
    }

    if (lateMinutes !== undefined) {
      attendance.lateMinutes = Math.max(
        Number(lateMinutes) || 0,
        0
      );
    } else {
      attendance.lateMinutes = calculateLateMinutes(
        attendance.checkIn
      );
    }

    if (notes !== undefined) {
      attendance.notes = notes;
    }

    /*
     * Prevent duplicate employee/date records
     */
    const duplicate = await Attendance.findOne({
      _id: { $ne: attendance._id },
      workspaceId,
      employeeId: attendance.employeeId,
      date: {
        $gte: normalizeDate(attendance.date),
        $lt: getNextDay(normalizeDate(attendance.date)),
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance already exists for this employee on this date",
      });
    }

    await attendance.save();

    const updatedAttendance =
      await Attendance.findOne({
        _id: attendance._id,
        workspaceId,
      })
        .populate({
          path: "employeeId",
          select:
            "employeeCode userId branchId joiningDate employmentType status",
          populate: [
            {
              path: "userId",
              select:
                "name email phone role department designation status",
              populate: {
                path: "role",
                select: "name",
              },
            },
            {
              path: "branchId",
              select: "name code status",
            },
          ],
        })
        .lean();

    return res.json({
      success: true,
      message: "Attendance updated successfully",
      data: updatedAttendance,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance already exists for this employee on this date",
      });
    }

    next(error);
  }
};

/**
 * DELETE /api/attendance/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const workspaceId = req.companyId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await Attendance.findOneAndDelete({
      _id: id,
      workspaceId,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    return res.json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};