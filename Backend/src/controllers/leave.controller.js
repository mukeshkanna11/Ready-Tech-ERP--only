const mongoose = require("mongoose");

const Leave = require("../models/Leave");

const Employee = require("../models/Employee");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeDate = (date) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  value.setHours(0, 0, 0, 0);

  return value;
};

const calculateTotalDays = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!start || !end || end < start) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor(
    (end.getTime() - start.getTime()) /
      millisecondsPerDay
  ) + 1;
};

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      employeeId,
      status,
      leaveType,
      year,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
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

    if (status) {
      filter.status = status;
    }

    if (leaveType) {
      filter.leaveType = leaveType;
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

      filter.startDate = {
        $gte: new Date(`${numericYear}-01-01T00:00:00.000Z`),
        $lt: new Date(
          `${numericYear + 1}-01-01T00:00:00.000Z`
        ),
      };
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      const employees = await Employee.find({
        workspaceId: req.companyId,
        $or: [
          {
            employeeCode: {
              $regex: trimmedSearch,
              $options: "i",
            },
          },
        ],
      })
        .select("_id")
        .lean();

      const employeeIds = employees.map(
        (employee) => employee._id
      );

      filter.$or = [
        {
          reason: {
            $regex: trimmedSearch,
            $options: "i",
          },
        },
        {
          employeeId: {
            $in: employeeIds,
          },
        },
      ];
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
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
        .populate("approvedBy", "name email")
        .populate("updatedBy", "name email")
        .sort({
          startDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Leave.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: leaves,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
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
      leaveType,
      startDate,
      endDate,
      reason = "",
    } = req.body;

    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Valid employee ID is required",
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
        message: "Leave cannot be created for an inactive employee",
      });
    }

    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);

    if (!normalizedStart || !normalizedEnd) {
      return res.status(400).json({
        success: false,
        message: "Valid start date and end date are required",
      });
    }

    if (normalizedEnd < normalizedStart) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const totalDays = calculateTotalDays(
      normalizedStart,
      normalizedEnd
    );

    if (!totalDays) {
      return res.status(400).json({
        success: false,
        message: "Unable to calculate leave duration",
      });
    }

    const overlappingLeave = await Leave.findOne({
      workspaceId: req.companyId,
      employeeId,
      status: {
        $in: ["pending", "approved"],
      },
      startDate: {
        $lte: normalizedEnd,
      },
      endDate: {
        $gte: normalizedStart,
      },
    }).lean();

    if (overlappingLeave) {
      return res.status(409).json({
        success: false,
        message:
          "This employee already has a pending or approved leave during the selected dates",
      });
    }

    const leave = await Leave.create({
      workspaceId: req.companyId,
      employeeId,
      leaveType,
      startDate: normalizedStart,
      endDate: normalizedEnd,
      totalDays,
      reason: reason.trim(),
      status: "pending",
      createdBy: req.userId,
    });

    const populatedLeave = await Leave.findById(
      leave._id
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
      .populate("createdBy", "name email")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Leave request created successfully",
      data: populatedLeave,
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
        message: "Invalid leave ID",
      });
    }

    const leave = await Leave.findOne({
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
      .populate("approvedBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: leave,
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
        message: "Invalid leave ID",
      });
    }

    const leave = await Leave.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending leave requests can be updated",
      });
    }

    const employeeId =
      req.body.employeeId || leave.employeeId;

    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
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

    const startDate =
      req.body.startDate || leave.startDate;

    const endDate =
      req.body.endDate || leave.endDate;

    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);

    if (!normalizedStart || !normalizedEnd) {
      return res.status(400).json({
        success: false,
        message: "Valid start date and end date are required",
      });
    }

    if (normalizedEnd < normalizedStart) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const overlappingLeave = await Leave.findOne({
      _id: {
        $ne: id,
      },
      workspaceId: req.companyId,
      employeeId,
      status: {
        $in: ["pending", "approved"],
      },
      startDate: {
        $lte: normalizedEnd,
      },
      endDate: {
        $gte: normalizedStart,
      },
    }).lean();

    if (overlappingLeave) {
      return res.status(409).json({
        success: false,
        message:
          "This employee already has another pending or approved leave during the selected dates",
      });
    }

    leave.employeeId = employeeId;

    if (req.body.leaveType !== undefined) {
      leave.leaveType = req.body.leaveType;
    }

    leave.startDate = normalizedStart;
    leave.endDate = normalizedEnd;
    leave.totalDays = calculateTotalDays(
      normalizedStart,
      normalizedEnd
    );

    if (req.body.reason !== undefined) {
      leave.reason = String(req.body.reason).trim();
    }

    leave.updatedBy = req.userId;

    await leave.save();

    const updatedLeave = await Leave.findById(
      leave._id
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
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Leave updated successfully",
      data: updatedLeave,
    });
  } catch (err) {
    next(err);
  }
};

const approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID",
      });
    }

    const leave = await Leave.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending leave requests can be approved",
      });
    }

    const conflictingLeave = await Leave.findOne({
      _id: {
        $ne: id,
      },
      workspaceId: req.companyId,
      employeeId: leave.employeeId,
      status: "approved",
      startDate: {
        $lte: leave.endDate,
      },
      endDate: {
        $gte: leave.startDate,
      },
    }).lean();

    if (conflictingLeave) {
      return res.status(409).json({
        success: false,
        message:
          "Another approved leave exists during the selected dates",
      });
    }

    leave.status = "approved";
    leave.approvedBy = req.userId;
    leave.approvedAt = new Date();
    leave.updatedBy = req.userId;
    leave.rejectionReason = "";

    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave approved successfully",
      data: leave,
    });
  } catch (err) {
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason = "" } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID",
      });
    }

    const leave = await Leave.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending leave requests can be rejected",
      });
    }

    leave.status = "rejected";
    leave.rejectionReason = String(
      rejectionReason
    ).trim();
    leave.updatedBy = req.userId;

    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave rejected successfully",
      data: leave,
    });
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID",
      });
    }

    const leave = await Leave.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    if (
      leave.status !== "pending" &&
      leave.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending or approved leave can be cancelled",
      });
    }

    leave.status = "cancelled";
    leave.updatedBy = req.userId;

    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave cancelled successfully",
      data: leave,
    });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID",
      });
    }

    const leave = await Leave.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending leave requests can be deleted",
      });
    }

    await Leave.deleteOne({
      _id: id,
      workspaceId: req.companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Leave deleted successfully",
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
  approve,
  reject,
  cancel,
  remove,
};