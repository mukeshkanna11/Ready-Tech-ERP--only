const mongoose = require("mongoose");

const Holiday = require("../models/Holiday");

// --------------------------------------------------
// Constants
// --------------------------------------------------

const ALLOWED_HOLIDAY_TYPES = [
  "PUBLIC",
  "COMPANY",
  "OPTIONAL",
  "RESTRICTED",
];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

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

const getWorkspaceId = (req) => {
  return req.companyId;
};

const getUserId = (req) => {
  return req.userId;
};

// --------------------------------------------------
// LIST HOLIDAYS
// GET /api/holidays
// --------------------------------------------------

exports.list = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const {
      year,
      holidayType,
      isActive,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Company/workspace is missing from authentication",
      });
    }

    const currentPage = Math.max(Number(page) || 1, 1);

    const perPage = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const filter = {
      workspaceId,
    };

    // --------------------------------------------------
    // YEAR FILTER
    // --------------------------------------------------

    if (year !== undefined) {
      const numericYear = Number(year);

      if (
        !Number.isInteger(numericYear) ||
        numericYear < 1900 ||
        numericYear > 3000
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
        });
      }

      const startDate = new Date(
        `${numericYear}-01-01T00:00:00.000Z`
      );

      const endDate = new Date(
        `${numericYear + 1}-01-01T00:00:00.000Z`
      );

      filter.date = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    // --------------------------------------------------
    // HOLIDAY TYPE FILTER
    // --------------------------------------------------

    if (holidayType) {
      if (!ALLOWED_HOLIDAY_TYPES.includes(holidayType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid holiday type",
        });
      }

      filter.holidayType = holidayType;
    }

    // --------------------------------------------------
    // ACTIVE STATUS FILTER
    // --------------------------------------------------

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid isActive value",
        });
      }

      filter.isActive = isActive === "true";
    }

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    if (search && search.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const skip = (currentPage - 1) * perPage;

    const [holidays, total] = await Promise.all([
      Holiday.find(filter)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort({
          date: 1,
          name: 1,
        })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Holiday.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return res.status(200).json({
      success: true,
      data: holidays,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// CREATE HOLIDAY
// POST /api/holidays
// --------------------------------------------------

exports.create = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Company/workspace is missing from authentication",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user is missing",
      });
    }

    const {
      name,
      date,
      description,
      holidayType,
      isRecurring,
      recurringMonth,
      recurringDay,
      isActive,
    } = req.body;

    // --------------------------------------------------
    // NAME
    // --------------------------------------------------

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Holiday name is required",
      });
    }

    const trimmedName = name.trim();

    // --------------------------------------------------
    // DATE
    // --------------------------------------------------

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Holiday date is required",
      });
    }

    const parsedDate = normalizeDate(date);

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday date",
      });
    }

    // --------------------------------------------------
    // HOLIDAY TYPE
    // --------------------------------------------------

    const finalHolidayType =
      holidayType || "COMPANY";

    if (
      !ALLOWED_HOLIDAY_TYPES.includes(
        finalHolidayType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday type",
      });
    }

    // --------------------------------------------------
    // RECURRING
    // --------------------------------------------------

    const finalIsRecurring = Boolean(isRecurring);

    let finalRecurringMonth = null;
    let finalRecurringDay = null;

    if (finalIsRecurring) {
      if (
        recurringMonth !== undefined &&
        recurringMonth !== null &&
        recurringMonth !== ""
      ) {
        const month = Number(recurringMonth);

        if (
          !Number.isInteger(month) ||
          month < 1 ||
          month > 12
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Recurring month must be between 1 and 12",
          });
        }

        finalRecurringMonth = month;
      }

      if (
        recurringDay !== undefined &&
        recurringDay !== null &&
        recurringDay !== ""
      ) {
        const day = Number(recurringDay);

        if (
          !Number.isInteger(day) ||
          day < 1 ||
          day > 31
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Recurring day must be between 1 and 31",
          });
        }

        finalRecurringDay = day;
      }
    }

    // --------------------------------------------------
    // DUPLICATE CHECK
    // Same workspace + same name + same date
    // --------------------------------------------------

    const existingHoliday = await Holiday.findOne({
      workspaceId,
      name: trimmedName,
      date: parsedDate,
    }).lean();

    if (existingHoliday) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday with the same name already exists on this date",
      });
    }

    // --------------------------------------------------
    // CREATE
    // --------------------------------------------------

    const holiday = await Holiday.create({
      workspaceId,
      name: trimmedName,
      date: parsedDate,
      description:
        description?.trim() || "",
      holidayType: finalHolidayType,
      isRecurring: finalIsRecurring,
      recurringMonth: finalRecurringMonth,
      recurringDay: finalRecurringDay,
      isActive:
        isActive !== undefined
          ? Boolean(isActive)
          : true,
      createdBy: userId,
    });

    // --------------------------------------------------
    // POPULATE CREATED HOLIDAY
    // --------------------------------------------------

    const populatedHoliday =
      await Holiday.findOne({
        _id: holiday._id,
        workspaceId,
      })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean();

    return res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: populatedHoliday,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday with the same information already exists",
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// GET HOLIDAY BY ID
// GET /api/holidays/:id
// --------------------------------------------------

exports.getById = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Company/workspace is missing from authentication",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findOne({
      _id: id,
      workspaceId,
    })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: holiday,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE HOLIDAY
// PUT /api/holidays/:id
// --------------------------------------------------

exports.update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Company/workspace is missing from authentication",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findOne({
      _id: id,
      workspaceId,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    const {
      name,
      date,
      description,
      holidayType,
      isRecurring,
      recurringMonth,
      recurringDay,
      isActive,
    } = req.body;

    // --------------------------------------------------
    // NAME
    // --------------------------------------------------

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Holiday name cannot be empty",
        });
      }

      holiday.name = name.trim();
    }

    // --------------------------------------------------
    // DATE
    // --------------------------------------------------

    if (date !== undefined) {
      const parsedDate = normalizeDate(date);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid holiday date",
        });
      }

      holiday.date = parsedDate;
    }

    // --------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------

    if (description !== undefined) {
      holiday.description =
        description?.trim() || "";
    }

    // --------------------------------------------------
    // HOLIDAY TYPE
    // --------------------------------------------------

    if (holidayType !== undefined) {
      if (
        !ALLOWED_HOLIDAY_TYPES.includes(
          holidayType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid holiday type",
        });
      }

      holiday.holidayType = holidayType;
    }

    // --------------------------------------------------
    // RECURRING
    // --------------------------------------------------

    if (isRecurring !== undefined) {
      const finalIsRecurring =
        Boolean(isRecurring);

      holiday.isRecurring = finalIsRecurring;

      if (!finalIsRecurring) {
        holiday.recurringMonth = null;
        holiday.recurringDay = null;
      } else {
        if (
          recurringMonth !== undefined &&
          recurringMonth !== null &&
          recurringMonth !== ""
        ) {
          const month = Number(recurringMonth);

          if (
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Recurring month must be between 1 and 12",
            });
          }

          holiday.recurringMonth = month;
        }

        if (
          recurringDay !== undefined &&
          recurringDay !== null &&
          recurringDay !== ""
        ) {
          const day = Number(recurringDay);

          if (
            !Number.isInteger(day) ||
            day < 1 ||
            day > 31
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Recurring day must be between 1 and 31",
            });
          }

          holiday.recurringDay = day;
        }
      }
    } else {
      // Allow recurring month/day to be updated
      // independently when recurring is already enabled.

      if (
        holiday.isRecurring &&
        recurringMonth !== undefined &&
        recurringMonth !== null &&
        recurringMonth !== ""
      ) {
        const month = Number(recurringMonth);

        if (
          !Number.isInteger(month) ||
          month < 1 ||
          month > 12
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Recurring month must be between 1 and 12",
          });
        }

        holiday.recurringMonth = month;
      }

      if (
        holiday.isRecurring &&
        recurringDay !== undefined &&
        recurringDay !== null &&
        recurringDay !== ""
      ) {
        const day = Number(recurringDay);

        if (
          !Number.isInteger(day) ||
          day < 1 ||
          day > 31
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Recurring day must be between 1 and 31",
          });
        }

        holiday.recurringDay = day;
      }
    }

    // --------------------------------------------------
    // ACTIVE STATUS
    // --------------------------------------------------

    if (isActive !== undefined) {
      holiday.isActive = Boolean(isActive);
    }

    // --------------------------------------------------
    // UPDATED BY
    // --------------------------------------------------

    if (userId) {
      holiday.updatedBy = userId;
    }

    // --------------------------------------------------
    // DUPLICATE CHECK
    // --------------------------------------------------

    const duplicate = await Holiday.findOne({
      _id: {
        $ne: holiday._id,
      },
      workspaceId,
      name: holiday.name,
      date: holiday.date,
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday with the same name already exists on this date",
      });
    }

    // --------------------------------------------------
    // SAVE
    // --------------------------------------------------

    await holiday.save();

    // --------------------------------------------------
    // POPULATE UPDATED HOLIDAY
    // --------------------------------------------------

    const updatedHoliday =
      await Holiday.findOne({
        _id: holiday._id,
        workspaceId,
      })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean();

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: updatedHoliday,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday with the same information already exists",
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// DELETE HOLIDAY
// DELETE /api/holidays/:id
// --------------------------------------------------

exports.remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Company/workspace is missing from authentication",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findOneAndDelete({
      _id: id,
      workspaceId,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// TOGGLE HOLIDAY STATUS
// PATCH /api/holidays/:id/status
// --------------------------------------------------

exports.toggleStatus = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Company/workspace is missing from authentication",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findOne({
      _id: id,
      workspaceId,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    holiday.isActive = !holiday.isActive;

    if (userId) {
      holiday.updatedBy = userId;
    }

    await holiday.save();

    const updatedHoliday =
      await Holiday.findOne({
        _id: holiday._id,
        workspaceId,
      })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean();

    return res.status(200).json({
      success: true,
      message: `Holiday ${
        updatedHoliday.isActive
          ? "activated"
          : "deactivated"
      } successfully`,
      data: updatedHoliday,
    });
  } catch (error) {
    next(error);
  }
};