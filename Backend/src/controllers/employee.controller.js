const mongoose = require("mongoose");

const Employee = require("../models/Employee");
const User = require("../models/User");
const Branch = require("../models/Branch");
const httpError = require("../utils/httpError");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const getWorkspaceId = (req) => {
  const workspaceId = req.companyId;

  if (!workspaceId) {
    throw httpError(403, "No workspace is linked to this account");
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    throw httpError(403, "Invalid workspace reference");
  }

  return workspaceId.toString();
};

const getEmployeeId = (req) => {
  const employeeId = req.params.id;

  if (!employeeId) {
    throw httpError(400, "Employee ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw httpError(400, "Invalid employee ID");
  }

  return employeeId.toString();
};

const trimmed = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const result = String(value).trim();

  return result || undefined;
};

const parsePagination = (req) => {
  const page = Math.max(
    Number.parseInt(req.query.page, 10) || 1,
    1
  );

  const requestedLimit =
    Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT;

  const limit = Math.min(
    Math.max(requestedLimit, 1),
    MAX_LIMIT
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const validateObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw httpError(400, `Invalid ${fieldName}`);
  }

  return value.toString();
};

const sanitizeEmployee = (employee) => {
  if (!employee) {
    return null;
  }

  const data = employee.toObject
    ? employee.toObject()
    : { ...employee };

  if (data.userId && typeof data.userId === "object") {
    delete data.userId.password;
    delete data.userId.passwordHash;
  }

  return data;
};

/*
 * GET /api/employees
 */
const list = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const {
      page,
      limit,
      skip,
    } = parsePagination(req);

    const query = {
      workspaceId,
    };

    const status = trimmed(req.query.status);

    if (status) {
      if (!["active", "inactive"].includes(status)) {
        throw httpError(400, "Invalid status");
      }

      query.status = status;
    }

    const branchId = trimmed(req.query.branchId);

    if (branchId) {
      query.branchId = validateObjectId(
        branchId,
        "branch ID"
      );
    }

    const employmentType = trimmed(
      req.query.employmentType
    );

    if (employmentType) {
      query.employmentType = employmentType;
    }

    const search = trimmed(req.query.search);

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i"
      );

      query.$or = [
        { employeeCode: regex },
      ];
    }

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate({
          path: "userId",
          select: "name email phone department designation role status",
          populate: {
            path: "role",
            select: "name status",
          },
        })
        .populate({
          path: "branchId",
          select: "name code status",
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Employee.countDocuments(query),
    ]);

    /*
     * User name/email search is handled after fetching matching
     * workspace employees when search is supplied.
     */
    let finalEmployees = employees;

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i"
      );

      finalEmployees = employees.filter((employee) => {
        const user = employee.userId;

        return (
          regex.test(employee.employeeCode || "") ||
          regex.test(user?.name || "") ||
          regex.test(user?.email || "") ||
          regex.test(user?.phone || "") ||
          regex.test(user?.department || "") ||
          regex.test(user?.designation || "")
        );
      });
    }

    return res.json({
      success: true,
      data: finalEmployees.map(sanitizeEmployee),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * GET /api/employees/:id
 */
const getById = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const employeeId = getEmployeeId(req);

    const employee = await Employee.findOne({
      _id: employeeId,
      workspaceId,
    })
      .populate({
        path: "userId",
        select: "name email phone department designation role status",
        populate: {
          path: "role",
          select: "name status",
        },
      })
      .populate({
        path: "branchId",
        select: "name code status",
      })
      .lean();

    if (!employee) {
      throw httpError(404, "Employee not found");
    }

    return res.json({
      success: true,
      data: sanitizeEmployee(employee),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * POST /api/employees
 */
const create = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const {
      userId,
      employeeCode,
      branchId,
      joiningDate,
      employmentType,
      gender,
      dateOfBirth,
      maritalStatus,
      address,
      city,
      state,
      country,
      postalCode,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      status,
      notes,
    } = req.body;

    if (!userId) {
      throw httpError(400, "User ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw httpError(400, "Invalid user ID");
    }

    if (!employeeCode) {
      throw httpError(400, "Employee code is required");
    }

    if (!branchId) {
      throw httpError(400, "Branch ID is required");
    }

    const normalizedEmployeeCode =
      String(employeeCode)
        .trim()
        .toUpperCase();

    const normalizedUserId =
      userId.toString();

    const normalizedBranchId =
      validateObjectId(
        branchId,
        "branch ID"
      );

    /*
     * User must belong to the same workspace.
     */
    const user = await User.findOne({
      _id: normalizedUserId,
      companyId: workspaceId,
    })
      .select("_id status")
      .lean();

    if (!user) {
      throw httpError(
        404,
        "User not found in this workspace"
      );
    }

    if (user.status !== "active") {
      throw httpError(
        400,
        "Only active users can be added as employees"
      );
    }

    /*
     * Branch must belong to the same workspace.
     */
    const branch = await Branch.findOne({
      _id: normalizedBranchId,
      workspaceId,
    })
      .select("_id status")
      .lean();

    if (!branch) {
      throw httpError(
        404,
        "Branch not found in this workspace"
      );
    }

    if (branch.status === "inactive") {
      throw httpError(
        400,
        "Cannot assign employee to an inactive branch"
      );
    }

    const existingCode = await Employee.findOne({
      workspaceId,
      employeeCode: normalizedEmployeeCode,
    })
      .select("_id")
      .lean();

    if (existingCode) {
      throw httpError(
        409,
        "Employee code already exists in this workspace"
      );
    }

    const existingUser = await Employee.findOne({
      workspaceId,
      userId: normalizedUserId,
    })
      .select("_id")
      .lean();

    if (existingUser) {
      throw httpError(
        409,
        "This user already has an employee profile"
      );
    }

    const employee = await Employee.create({
      workspaceId,
      userId: normalizedUserId,
      employeeCode: normalizedEmployeeCode,
      branchId: normalizedBranchId,
      joiningDate,
      employmentType,
      gender,
      dateOfBirth,
      maritalStatus,
      address: trimmed(address),
      city: trimmed(city),
      state: trimmed(state),
      country: trimmed(country) || "India",
      postalCode: trimmed(postalCode),
      emergencyContactName: trimmed(
        emergencyContactName
      ),
      emergencyContactPhone: trimmed(
        emergencyContactPhone
      ),
      emergencyContactRelation: trimmed(
        emergencyContactRelation
      ),
      status: status || "active",
      notes: trimmed(notes),
    });

    const createdEmployee = await Employee.findOne({
      _id: employee._id,
      workspaceId,
    })
      .populate({
        path: "userId",
        select: "name email phone department designation role status",
        populate: {
          path: "role",
          select: "name status",
        },
      })
      .populate({
        path: "branchId",
        select: "name code status",
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: sanitizeEmployee(createdEmployee),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * PUT /api/employees/:id
 */
const update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const employeeId = getEmployeeId(req);

    const employee = await Employee.findOne({
      _id: employeeId,
      workspaceId,
    });

    if (!employee) {
      throw httpError(404, "Employee not found");
    }

    const {
      employeeCode,
      branchId,
      joiningDate,
      employmentType,
      gender,
      dateOfBirth,
      maritalStatus,
      address,
      city,
      state,
      country,
      postalCode,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      status,
      notes,
    } = req.body;

    if (employeeCode !== undefined) {
      const normalizedCode =
        String(employeeCode)
          .trim()
          .toUpperCase();

      if (!normalizedCode) {
        throw httpError(
          400,
          "Employee code is required"
        );
      }

      const duplicate = await Employee.findOne({
        workspaceId,
        employeeCode: normalizedCode,
        _id: {
          $ne: employeeId,
        },
      })
        .select("_id")
        .lean();

      if (duplicate) {
        throw httpError(
          409,
          "Employee code already exists in this workspace"
        );
      }

      employee.employeeCode = normalizedCode;
    }

    if (branchId !== undefined) {
      const normalizedBranchId =
        validateObjectId(
          branchId,
          "branch ID"
        );

      const branch = await Branch.findOne({
        _id: normalizedBranchId,
        workspaceId,
      })
        .select("_id status")
        .lean();

      if (!branch) {
        throw httpError(
          404,
          "Branch not found in this workspace"
        );
      }

      if (branch.status === "inactive") {
        throw httpError(
          400,
          "Cannot assign employee to an inactive branch"
        );
      }

      employee.branchId = normalizedBranchId;
    }

    if (joiningDate !== undefined) {
      employee.joiningDate = joiningDate;
    }

    if (employmentType !== undefined) {
      employee.employmentType = employmentType;
    }

    if (gender !== undefined) {
      employee.gender = gender;
    }

    if (dateOfBirth !== undefined) {
      employee.dateOfBirth = dateOfBirth;
    }

    if (maritalStatus !== undefined) {
      employee.maritalStatus = maritalStatus;
    }

    if (address !== undefined) {
      employee.address = trimmed(address);
    }

    if (city !== undefined) {
      employee.city = trimmed(city);
    }

    if (state !== undefined) {
      employee.state = trimmed(state);
    }

    if (country !== undefined) {
      employee.country =
        trimmed(country) || "India";
    }

    if (postalCode !== undefined) {
      employee.postalCode =
        trimmed(postalCode);
    }

    if (emergencyContactName !== undefined) {
      employee.emergencyContactName =
        trimmed(emergencyContactName);
    }

    if (emergencyContactPhone !== undefined) {
      employee.emergencyContactPhone =
        trimmed(emergencyContactPhone);
    }

    if (emergencyContactRelation !== undefined) {
      employee.emergencyContactRelation =
        trimmed(emergencyContactRelation);
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        throw httpError(400, "Invalid status");
      }

      employee.status = status;
    }

    if (notes !== undefined) {
      employee.notes = trimmed(notes);
    }

    await employee.save();

    const updatedEmployee = await Employee.findOne({
      _id: employee._id,
      workspaceId,
    })
      .populate({
        path: "userId",
        select: "name email phone department designation role status",
        populate: {
          path: "role",
          select: "name status",
        },
      })
      .populate({
        path: "branchId",
        select: "name code status",
      })
      .lean();

    return res.json({
      success: true,
      message: "Employee updated successfully",
      data: sanitizeEmployee(updatedEmployee),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * DELETE /api/employees/:id
 *
 * Soft delete only.
 */
const remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const employeeId = getEmployeeId(req);

    const employee = await Employee.findOneAndUpdate(
      {
        _id: employeeId,
        workspaceId,
        status: "active",
      },
      {
        $set: {
          status: "inactive",
        },
      },
      {
        new: true,
      }
    )
      .populate({
        path: "userId",
        select: "name email phone department designation role status",
        populate: {
          path: "role",
          select: "name status",
        },
      })
      .populate({
        path: "branchId",
        select: "name code status",
      })
      .lean();

    if (!employee) {
      throw httpError(
        404,
        "Active employee not found"
      );
    }

    return res.json({
      success: true,
      message: "Employee deactivated successfully",
      data: sanitizeEmployee(employee),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * PATCH /api/employees/:id/restore
 */
const restore = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const employeeId = getEmployeeId(req);

    const employee = await Employee.findOneAndUpdate(
      {
        _id: employeeId,
        workspaceId,
        status: "inactive",
      },
      {
        $set: {
          status: "active",
        },
      },
      {
        new: true,
      }
    )
      .populate({
        path: "userId",
        select: "name email phone department designation role status",
        populate: {
          path: "role",
          select: "name status",
        },
      })
      .populate({
        path: "branchId",
        select: "name code status",
      })
      .lean();

    if (!employee) {
      throw httpError(
        404,
        "Inactive employee not found"
      );
    }

    return res.json({
      success: true,
      message: "Employee restored successfully",
      data: sanitizeEmployee(employee),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  restore,
};