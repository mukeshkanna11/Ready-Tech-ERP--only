const mongoose = require("mongoose");

const Performance = require("../models/Performance");
const Employee = require("../models/Employee");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const validateEmployee = async (
  employeeId,
  workspaceId
) => {
  if (!isValidObjectId(employeeId)) {
    return null;
  }

  return Employee.findOne({
    _id: employeeId,
    workspaceId,
  }).lean();
};

const validateGoals = (goals) => {
  if (goals === undefined) {
    return {
      valid: true,
      value: undefined,
    };
  }

  if (!Array.isArray(goals)) {
    return {
      valid: false,
      message: "Goals must be an array",
    };
  }

  const normalized = goals.map((goal) => ({
    title: String(goal.title || "").trim(),
    description: String(
      goal.description || ""
    ).trim(),
    target: String(
      goal.target || ""
    ).trim(),
    achievement: String(
      goal.achievement || ""
    ).trim(),
    rating:
      goal.rating === null ||
      goal.rating === undefined ||
      goal.rating === ""
        ? null
        : Number(goal.rating),
    weight:
      goal.weight === null ||
      goal.weight === undefined ||
      goal.weight === ""
        ? 0
        : Number(goal.weight),
  }));

  for (const goal of normalized) {
    if (!goal.title) {
      return {
        valid: false,
        message:
          "Each goal must have a title",
      };
    }

    if (
      goal.rating !== null &&
      (!Number.isFinite(goal.rating) ||
        goal.rating < 1 ||
        goal.rating > 5)
    ) {
      return {
        valid: false,
        message:
          "Goal rating must be between 1 and 5",
      };
    }

    if (
      !Number.isFinite(goal.weight) ||
      goal.weight < 0 ||
      goal.weight > 100
    ) {
      return {
        valid: false,
        message:
          "Goal weight must be between 0 and 100",
      };
    }
  }

  return {
    valid: true,
    value: normalized,
  };
};

const validateSkills = (skills) => {
  if (skills === undefined) {
    return {
      valid: true,
      value: undefined,
    };
  }

  if (!Array.isArray(skills)) {
    return {
      valid: false,
      message: "Skills must be an array",
    };
  }

  const normalized = skills.map((skill) => ({
    name: String(skill.name || "").trim(),
    rating:
      skill.rating === null ||
      skill.rating === undefined ||
      skill.rating === ""
        ? null
        : Number(skill.rating),
    comments: String(
      skill.comments || ""
    ).trim(),
  }));

  for (const skill of normalized) {
    if (!skill.name) {
      return {
        valid: false,
        message:
          "Each skill must have a name",
      };
    }

    if (
      skill.rating !== null &&
      (!Number.isFinite(skill.rating) ||
        skill.rating < 1 ||
        skill.rating > 5)
    ) {
      return {
        valid: false,
        message:
          "Skill rating must be between 1 and 5",
      };
    }
  }

  return {
    valid: true,
    value: normalized,
  };
};

const buildPerformanceQuery = (
  req
) => {
  const {
    employeeId,
    status,
    reviewType,
    year,
    search = "",
  } = req.query;

  const filter = {
    workspaceId: req.companyId,
  };

  if (employeeId) {
    filter.employeeId = employeeId;
  }

  if (status) {
    filter.status = status;
  }

  if (reviewType) {
    filter.reviewType = reviewType;
  }

  if (year) {
    const numericYear = Number(year);

    if (
      Number.isInteger(numericYear) &&
      numericYear >= 2000 &&
      numericYear <= 2100
    ) {
      const start = new Date(
        `${numericYear}-01-01T00:00:00.000Z`
      );

      const end = new Date(
        `${numericYear + 1}-01-01T00:00:00.000Z`
      );

      filter.reviewPeriodStart = {
        $gte: start,
        $lt: end,
      };
    }
  }

  return {
    filter,
    search: search.trim(),
  };
};

const list = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const {
      filter,
      search,
    } = buildPerformanceQuery(req);

    if (search) {
      const employees =
        await Employee.find({
          workspaceId: req.companyId,
          employeeCode: {
            $regex: search,
            $options: "i",
          },
        })
          .select("_id")
          .lean();

      filter.$or = [
        {
          employeeId: {
            $in: employees.map(
              (employee) => employee._id
            ),
          },
        },
        {
          strengths: {
            $regex: search,
            $options: "i",
          },
        },
        {
          managerComments: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      performances,
      total,
    ] = await Promise.all([
      Performance.find(filter)
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
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .populate(
          "reviewedBy",
          "name email"
        )
        .populate(
          "approvedBy",
          "name email"
        )
        .sort({
          reviewPeriodEnd: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Performance.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: performances,
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

const create = async (
  req,
  res,
  next
) => {
  try {
    const {
      employeeId,
      reviewPeriodStart,
      reviewPeriodEnd,
      reviewType = "quarterly",
      goals = [],
      skills = [],
      strengths = "",
      areasOfImprovement = "",
      achievements = "",
      managerComments = "",
      employeeComments = "",
      overallRating = null,
    } = req.body;

    if (
      !isValidObjectId(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid employee ID is required",
      });
    }

    const employee =
      await validateEmployee(
        employeeId,
        req.companyId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Employee not found",
      });
    }

    const start =
      normalizeDate(
        reviewPeriodStart
      );

    const end =
      normalizeDate(
        reviewPeriodEnd
      );

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message:
          "Valid review period dates are required",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message:
          "Review period start date cannot be after end date",
      });
    }

    const validGoalResult =
      validateGoals(goals);

    if (!validGoalResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          validGoalResult.message,
      });
    }

    const validSkillResult =
      validateSkills(skills);

    if (!validSkillResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          validSkillResult.message,
      });
    }

    let normalizedRating = null;

    if (
      overallRating !== null &&
      overallRating !== undefined &&
      overallRating !== ""
    ) {
      normalizedRating =
        Number(overallRating);

      if (
        !Number.isFinite(
          normalizedRating
        ) ||
        normalizedRating < 1 ||
        normalizedRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Overall rating must be between 1 and 5",
        });
      }
    }

    const existing =
      await Performance.findOne({
        workspaceId: req.companyId,
        employeeId,
        reviewPeriodStart: start,
        reviewPeriodEnd: end,
        reviewType,
      }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Performance review already exists for this period",
      });
    }

    const performance =
      await Performance.create({
        workspaceId: req.companyId,
        employeeId,

        reviewPeriodStart: start,
        reviewPeriodEnd: end,

        reviewType,

        goals:
          validGoalResult.value || [],

        skills:
          validSkillResult.value || [],

        strengths: String(
          strengths || ""
        ).trim(),

        areasOfImprovement:
          String(
            areasOfImprovement || ""
          ).trim(),

        achievements: String(
          achievements || ""
        ).trim(),

        managerComments:
          String(
            managerComments || ""
          ).trim(),

        employeeComments:
          String(
            employeeComments || ""
          ).trim(),

        overallRating:
          normalizedRating,

        status: "draft",

        createdBy: req.userId,
      });

    const populated =
      await Performance.findById(
        performance._id
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
          "createdBy",
          "name email"
        )
        .lean();

    return res.status(201).json({
      success: true,
      message:
        "Performance review created successfully",
      data: populated,
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
          "Invalid performance ID",
      });
    }

    const performance =
      await Performance.findOne({
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
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .populate(
          "submittedBy",
          "name email"
        )
        .populate(
          "reviewedBy",
          "name email"
        )
        .populate(
          "approvedBy",
          "name email"
        )
        .populate(
          "closedBy",
          "name email"
        )
        .lean();

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (err) {
    next(err);
  }
};

const update = async (
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
          "Invalid performance ID",
      });
    }

    const performance =
      await Performance.findOne({
        _id: id,
        workspaceId: req.companyId,
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    if (
      !["draft", "submitted"].includes(
        performance.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft or submitted reviews can be updated",
      });
    }

    const {
      employeeId,
      reviewPeriodStart,
      reviewPeriodEnd,
      reviewType,
      goals,
      skills,
      strengths,
      areasOfImprovement,
      achievements,
      managerComments,
      employeeComments,
      overallRating,
    } = req.body;

    if (employeeId !== undefined) {
      if (
        !isValidObjectId(employeeId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid employee ID",
        });
      }

      const employee =
        await validateEmployee(
          employeeId,
          req.companyId
        );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee not found",
        });
      }

      performance.employeeId =
        employeeId;
    }

    if (
      reviewPeriodStart !==
      undefined
    ) {
      const start =
        normalizeDate(
          reviewPeriodStart
        );

      if (!start) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid review start date",
        });
      }

      performance.reviewPeriodStart =
        start;
    }

    if (
      reviewPeriodEnd !==
      undefined
    ) {
      const end =
        normalizeDate(
          reviewPeriodEnd
        );

      if (!end) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid review end date",
        });
      }

      performance.reviewPeriodEnd =
        end;
    }

    if (
      performance.reviewPeriodStart >
      performance.reviewPeriodEnd
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Review period start date cannot be after end date",
      });
    }

    if (reviewType !== undefined) {
      performance.reviewType =
        reviewType;
    }

    if (goals !== undefined) {
      const result =
        validateGoals(goals);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      performance.goals =
        result.value;
    }

    if (skills !== undefined) {
      const result =
        validateSkills(skills);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      performance.skills =
        result.value;
    }

    if (strengths !== undefined) {
      performance.strengths =
        String(strengths).trim();
    }

    if (
      areasOfImprovement !==
      undefined
    ) {
      performance.areasOfImprovement =
        String(
          areasOfImprovement
        ).trim();
    }

    if (achievements !== undefined) {
      performance.achievements =
        String(achievements).trim();
    }

    if (
      managerComments !== undefined
    ) {
      performance.managerComments =
        String(
          managerComments
        ).trim();
    }

    if (
      employeeComments !== undefined
    ) {
      performance.employeeComments =
        String(
          employeeComments
        ).trim();
    }

    if (overallRating !== undefined) {
      const rating =
        overallRating === null ||
        overallRating === ""
          ? null
          : Number(overallRating);

      if (
        rating !== null &&
        (!Number.isFinite(rating) ||
          rating < 1 ||
          rating > 5)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Overall rating must be between 1 and 5",
        });
      }

      performance.overallRating =
        rating;
    }

    performance.updatedBy =
      req.userId;

    await performance.save();

    const updated =
      await Performance.findById(
        performance._id
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
        .lean();

    return res.status(200).json({
      success: true,
      message:
        "Performance review updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const submit = async (
  req,
  res,
  next
) => {
  try {
    const performance =
      await Performance.findOne({
        _id: req.params.id,
        workspaceId: req.companyId,
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    if (performance.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft reviews can be submitted",
      });
    }

    performance.status =
      "submitted";

    performance.submittedAt =
      new Date();

    performance.submittedBy =
      req.userId;

    performance.updatedBy =
      req.userId;

    await performance.save();

    return res.status(200).json({
      success: true,
      message:
        "Performance review submitted successfully",
      data: performance,
    });
  } catch (err) {
    next(err);
  }
};

const review = async (
  req,
  res,
  next
) => {
  try {
    const performance =
      await Performance.findOne({
        _id: req.params.id,
        workspaceId: req.companyId,
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    if (
      performance.status !==
      "submitted"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only submitted reviews can be reviewed",
      });
    }

    performance.status =
      "reviewed";

    performance.reviewedAt =
      new Date();

    performance.reviewedBy =
      req.userId;

    performance.updatedBy =
      req.userId;

    await performance.save();

    return res.status(200).json({
      success: true,
      message:
        "Performance review marked as reviewed",
      data: performance,
    });
  } catch (err) {
    next(err);
  }
};

const approve = async (
  req,
  res,
  next
) => {
  try {
    const performance =
      await Performance.findOne({
        _id: req.params.id,
        workspaceId: req.companyId,
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    if (
      !["submitted", "reviewed"].includes(
        performance.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only submitted or reviewed reviews can be approved",
      });
    }

    performance.status =
      "approved";

    performance.approvedAt =
      new Date();

    performance.approvedBy =
      req.userId;

    performance.updatedBy =
      req.userId;

    await performance.save();

    return res.status(200).json({
      success: true,
      message:
        "Performance review approved successfully",
      data: performance,
    });
  } catch (err) {
    next(err);
  }
};

const close = async (
  req,
  res,
  next
) => {
  try {
    const performance =
      await Performance.findOne({
        _id: req.params.id,
        workspaceId: req.companyId,
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    if (
      performance.status !==
      "approved"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only approved reviews can be closed",
      });
    }

    performance.status =
      "closed";

    performance.closedAt =
      new Date();

    performance.closedBy =
      req.userId;

    performance.updatedBy =
      req.userId;

    await performance.save();

    return res.status(200).json({
      success: true,
      message:
        "Performance review closed successfully",
      data: performance,
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
    const performance =
      await Performance.findOne({
        _id: req.params.id,
        workspaceId: req.companyId,
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message:
          "Performance review not found",
      });
    }

    if (
      performance.status !==
      "draft"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft reviews can be deleted",
      });
    }

    await Performance.deleteOne({
      _id: performance._id,
      workspaceId: req.companyId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Performance review deleted successfully",
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
  submit,
  review,
  approve,
  close,
  remove,
};