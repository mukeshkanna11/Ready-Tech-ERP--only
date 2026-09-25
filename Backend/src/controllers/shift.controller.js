const mongoose = require("mongoose");

const Shift = require("../models/Shift");

const Employee = require("../models/Employee");

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      shiftType,
      isActive,
    } = req.query;

    const workspaceId = req.companyId;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {
      workspaceId,
    };

    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          code: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    if (shiftType) {
      filter.shiftType = shiftType;
    }

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [shifts, total] = await Promise.all([
      Shift.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean(),

      Shift.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: shifts,
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
    const workspaceId = req.companyId;
    const userId = req.userId;

    const {
      name,
      code,
      startTime,
      endTime,
      breakMinutes,
      graceMinutes,
      workingMinutes,
      shiftType,
      isActive,
    } = req.body;

    const shift = await Shift.create({
      workspaceId,
      name,
      code,
      startTime,
      endTime,
      breakMinutes,
      graceMinutes,
      workingMinutes,
      shiftType,
      isActive,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Shift created successfully",
      data: shift,
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const shift = await Shift.findOne({
      _id: id,
      workspaceId: req.companyId,
    })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "startTime",
      "endTime",
      "breakMinutes",
      "graceMinutes",
      "workingMinutes",
      "shiftType",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    updates.updatedBy = req.userId;

    const shift = await Shift.findOneAndUpdate(
      {
        _id: id,
        workspaceId: req.companyId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shift updated successfully",
      data: shift,
    });
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const shift = await Shift.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    shift.isActive = !shift.isActive;
    shift.updatedBy = req.userId;

    await shift.save();

    return res.status(200).json({
      success: true,
      message: `Shift ${
        shift.isActive ? "activated" : "deactivated"
      } successfully`,
      data: shift,
    });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const shift = await Shift.findOne({
      _id: id,
      workspaceId: req.companyId,
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    const employeeCount = await Employee.countDocuments({
      workspaceId: req.companyId,
      shiftId: id,
      status: "active",
    });

    if (employeeCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This shift is assigned to active employees. Reassign them before deleting the shift.",
      });
    }

    await Shift.deleteOne({
      _id: id,
      workspaceId: req.companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Shift deleted successfully",
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
  toggleStatus,
  remove,
};