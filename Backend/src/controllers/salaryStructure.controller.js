const mongoose = require("mongoose");

const SalaryStructure = require("../models/SalaryStructure");
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

const normalizeComponent = (
  component,
  isDeduction = false
) => {
  const normalized = {
    name: String(
      component.name || ""
    ).trim(),

    code: String(
      component.code || ""
    )
      .trim()
      .toUpperCase(),

    type:
      component.type === "percentage"
        ? "percentage"
        : "fixed",

    value: Number(
      component.value ?? 0
    ),

    percentageOf:
      component.percentageOf ||
      "none",

    isActive:
      component.isActive !== false,
  };

  if (!isDeduction) {
    normalized.isTaxable =
      component.isTaxable !== false;
  }

  return normalized;
};

const validateComponents = (
  components,
  isDeduction = false
) => {
  if (components === undefined) {
    return {
      valid: true,
      value: undefined,
    };
  }

  if (!Array.isArray(components)) {
    return {
      valid: false,
      message:
        "Components must be an array",
    };
  }

  const normalized =
    components.map((component) =>
      normalizeComponent(
        component || {},
        isDeduction
      )
    );

  const codes = new Set();

  for (const component of normalized) {
    if (!component.name) {
      return {
        valid: false,
        message:
          "Every salary component requires a name",
      };
    }

    if (!component.code) {
      return {
        valid: false,
        message:
          "Every salary component requires a code",
      };
    }

    if (
      !Number.isFinite(
        component.value
      ) ||
      component.value < 0
    ) {
      return {
        valid: false,
        message:
          "Salary component value must be zero or greater",
      };
    }

    if (
      codes.has(component.code)
    ) {
      return {
        valid: false,
        message:
          `Duplicate component code: ${component.code}`,
      };
    }

    codes.add(component.code);

    if (
      component.type ===
        "percentage" &&
      component.value > 100
    ) {
      return {
        valid: false,
        message:
          `Percentage value for ${component.code} cannot exceed 100`,
      };
    }

    if (
      component.type ===
        "percentage" &&
      component.percentageOf ===
        "none"
    ) {
      return {
        valid: false,
        message:
          `Percentage component ${component.code} requires percentageOf`,
      };
    }
  }

  return {
    valid: true,
    value: normalized,
  };
};

const validateStructure = (
  body
) => {
  const {
    name,
    code,
    basicSalary,
    basicSalaryType = "fixed",
    basicSalaryPercentageOf = "none",
    effectiveFrom,
    effectiveTo,
  } = body;

  if (!String(name || "").trim()) {
    return {
      valid: false,
      message:
        "Salary structure name is required",
    };
  }

  if (!String(code || "").trim()) {
    return {
      valid: false,
      message:
        "Salary structure code is required",
    };
  }

  const basic =
    Number(basicSalary);

  if (
    !Number.isFinite(basic) ||
    basic < 0
  ) {
    return {
      valid: false,
      message:
        "Basic salary must be zero or greater",
    };
  }

  if (
    basicSalaryType ===
      "percentage" &&
    basic > 100
  ) {
    return {
      valid: false,
      message:
        "Basic salary percentage cannot exceed 100",
    };
  }

  if (
    basicSalaryType ===
      "percentage" &&
    basicSalaryPercentageOf ===
      "none"
  ) {
    return {
      valid: false,
      message:
        "Basic salary percentage requires a base",
    };
  }

  const start =
    normalizeDate(effectiveFrom);

  if (!start) {
    return {
      valid: false,
      message:
        "Valid effective-from date is required",
    };
  }

  let end = null;

  if (effectiveTo) {
    end = normalizeDate(
      effectiveTo
    );

    if (!end) {
      return {
        valid: false,
        message:
          "Invalid effective-to date",
      };
    }

    if (end < start) {
      return {
        valid: false,
        message:
          "Effective-to date cannot be before effective-from date",
      };
    }
  }

  return {
    valid: true,
    values: {
      name: String(name).trim(),
      code: String(code)
        .trim()
        .toUpperCase(),
      basicSalary: basic,
      basicSalaryType,
      basicSalaryPercentageOf,
      effectiveFrom: start,
      effectiveTo: end,
    },
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
      search = "",
      isActive,
      payFrequency,
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        Number(limit) || 10,
        1
      ),
      100
    );

    const filter = {
      workspaceId: req.companyId,
    };

    if (isActive !== undefined) {
      filter.isActive =
        isActive === "true";
    }

    if (payFrequency) {
      filter.payFrequency =
        payFrequency;
    }

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
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      structures,
      total,
    ] = await Promise.all([
      SalaryStructure.find(filter)
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .sort({
          isActive: -1,
          effectiveFrom: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      SalaryStructure.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: structures,
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
      description = "",
      payFrequency = "monthly",
      currency = "INR",
      earnings = [],
      deductions = [],
      employerContributions = [],
      isActive = true,
      notes = "",
    } = req.body;

    const validation =
      validateStructure(
        req.body
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          validation.message,
      });
    }

    const earningsResult =
      validateComponents(
        earnings,
        false
      );

    if (!earningsResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          earningsResult.message,
      });
    }

    const deductionsResult =
      validateComponents(
        deductions,
        true
      );

    if (!deductionsResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          deductionsResult.message,
      });
    }

    const employerResult =
      validateComponents(
        employerContributions,
        true
      );

    if (!employerResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          employerResult.message,
      });
    }

    const existing =
      await SalaryStructure.findOne({
        workspaceId: req.companyId,
        code: validation.values.code,
      }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Salary structure code already exists",
      });
    }

    const structure =
      await SalaryStructure.create({
        workspaceId:
          req.companyId,

        ...validation.values,

        description: String(
          description || ""
        ).trim(),

        payFrequency,

        currency: String(
          currency || "INR"
        )
          .trim()
          .toUpperCase(),

        earnings:
          earningsResult.value ||
          [],

        deductions:
          deductionsResult.value ||
          [],

        employerContributions:
          employerResult.value ||
          [],

        isActive:
          Boolean(isActive),

        notes: String(
          notes || ""
        ).trim(),

        createdBy:
          req.userId,
      });

    const populated =
      await SalaryStructure.findById(
        structure._id
      )
        .populate(
          "createdBy",
          "name email"
        )
        .lean();

    return res.status(201).json({
      success: true,
      message:
        "Salary structure created successfully",
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
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid salary structure ID",
      });
    }

    const structure =
      await SalaryStructure.findOne({
        _id: id,
        workspaceId:
          req.companyId,
      })
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .lean();

    if (!structure) {
      return res.status(404).json({
        success: false,
        message:
          "Salary structure not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: structure,
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
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid salary structure ID",
      });
    }

    const structure =
      await SalaryStructure.findOne({
        _id: id,
        workspaceId:
          req.companyId,
      });

    if (!structure) {
      return res.status(404).json({
        success: false,
        message:
          "Salary structure not found",
      });
    }

    const {
      name,
      code,
      description,
      basicSalary,
      basicSalaryType,
      basicSalaryPercentageOf,
      payFrequency,
      currency,
      earnings,
      deductions,
      employerContributions,
      effectiveFrom,
      effectiveTo,
      isActive,
      notes,
    } = req.body;

    const merged = {
      name:
        name !== undefined
          ? name
          : structure.name,

      code:
        code !== undefined
          ? code
          : structure.code,

      basicSalary:
        basicSalary !== undefined
          ? basicSalary
          : structure.basicSalary,

      basicSalaryType:
        basicSalaryType !==
        undefined
          ? basicSalaryType
          : structure.basicSalaryType,

      basicSalaryPercentageOf:
        basicSalaryPercentageOf !==
        undefined
          ? basicSalaryPercentageOf
          : structure.basicSalaryPercentageOf,

      effectiveFrom:
        effectiveFrom !== undefined
          ? effectiveFrom
          : structure.effectiveFrom,

      effectiveTo:
        effectiveTo !== undefined
          ? effectiveTo
          : structure.effectiveTo,
    };

    const validation =
      validateStructure(
        merged
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          validation.message,
      });
    }

    if (
      validation.values.code !==
      structure.code
    ) {
      const duplicate =
        await SalaryStructure.findOne({
          workspaceId:
            req.companyId,

          code:
            validation.values.code,

          _id: {
            $ne: structure._id,
          },
        }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Salary structure code already exists",
        });
      }
    }

    if (earnings !== undefined) {
      const result =
        validateComponents(
          earnings,
          false
        );

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message:
            result.message,
        });
      }

      structure.earnings =
        result.value;
    }

    if (deductions !== undefined) {
      const result =
        validateComponents(
          deductions,
          true
        );

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message:
            result.message,
        });
      }

      structure.deductions =
        result.value;
    }

    if (
      employerContributions !==
      undefined
    ) {
      const result =
        validateComponents(
          employerContributions,
          true
        );

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message:
            result.message,
        });
      }

      structure.employerContributions =
        result.value;
    }

    structure.name =
      validation.values.name;

    structure.code =
      validation.values.code;

    structure.basicSalary =
      validation.values.basicSalary;

    structure.basicSalaryType =
      validation.values.basicSalaryType;

    structure.basicSalaryPercentageOf =
      validation.values.basicSalaryPercentageOf;

    structure.effectiveFrom =
      validation.values.effectiveFrom;

    structure.effectiveTo =
      validation.values.effectiveTo;

    if (description !== undefined) {
      structure.description =
        String(
          description || ""
        ).trim();
    }

    if (payFrequency !== undefined) {
      structure.payFrequency =
        payFrequency;
    }

    if (currency !== undefined) {
      structure.currency =
        String(currency)
          .trim()
          .toUpperCase();
    }

    if (isActive !== undefined) {
      structure.isActive =
        Boolean(isActive);
    }

    if (notes !== undefined) {
      structure.notes =
        String(
          notes || ""
        ).trim();
    }

    structure.updatedBy =
      req.userId;

    await structure.save();

    const updated =
      await SalaryStructure.findById(
        structure._id
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

    return res.status(200).json({
      success: true,
      message:
        "Salary structure updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (
  req,
  res,
  next
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid salary structure ID",
      });
    }

    const structure =
      await SalaryStructure.findOne({
        _id: id,
        workspaceId:
          req.companyId,
      });

    if (!structure) {
      return res.status(404).json({
        success: false,
        message:
          "Salary structure not found",
      });
    }

    structure.isActive =
      !structure.isActive;

    structure.updatedBy =
      req.userId;

    await structure.save();

    return res.status(200).json({
      success: true,
      message:
        structure.isActive
          ? "Salary structure activated successfully"
          : "Salary structure deactivated successfully",
      data: structure,
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
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid salary structure ID",
      });
    }

    const structure =
      await SalaryStructure.findOne({
        _id: id,
        workspaceId:
          req.companyId,
      });

    if (!structure) {
      return res.status(404).json({
        success: false,
        message:
          "Salary structure not found",
      });
    }

    /*
     * Do not delete active structures.
     * Deactivate them instead.
     */
    if (structure.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Active salary structures cannot be deleted. Deactivate them first.",
      });
    }

    await SalaryStructure.deleteOne({
      _id: structure._id,
      workspaceId:
        req.companyId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Salary structure deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getActive = async (
  req,
  res,
  next
) => {
  try {
    const structures =
      await SalaryStructure.find({
        workspaceId:
          req.companyId,

        isActive: true,
      })
        .sort({
          effectiveFrom: -1,
          name: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      data: structures,
    });
  } catch (err) {
    next(err);
  }
};

const getApplicable = async (
  req,
  res,
  next
) => {
  try {
    const {
      employeeId,
      date,
    } = req.query;

    if (
      !isValidObjectId(
        employeeId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid employee ID is required",
      });
    }

    const employee =
      await Employee.findOne({
        _id: employeeId,
        workspaceId:
          req.companyId,
      }).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Employee not found",
      });
    }

    const targetDate =
      date
        ? normalizeDate(date)
        : new Date();

    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid date",
      });
    }

    const structure =
      await SalaryStructure.findOne({
        workspaceId:
          req.companyId,

        isActive: true,

        effectiveFrom: {
          $lte: targetDate,
        },

        $or: [
          {
            effectiveTo: null,
          },

          {
            effectiveTo: {
              $gte: targetDate,
            },
          },
        ],
      })
        .sort({
          effectiveFrom: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      data: structure,
      meta: {
        employeeId,
        date: targetDate,
      },
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
  getActive,
  getApplicable,
};