const mongoose = require('mongoose');

const User = require('../models/User');
const Role = require('../models/Role');
const httpError = require('../utils/httpError');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const STATUSES = ['active', 'inactive'];

const trimmed = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const result = String(value).trim();

  return result || undefined;
};

const getWorkspaceId = (req) => {
  const workspaceId = req.companyId;

  if (!workspaceId) {
    throw httpError(
      403,
      'No workspace is linked to this account'
    );
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    throw httpError(
      403,
      'Invalid workspace reference'
    );
  }

  return workspaceId.toString();
};

const getUserId = (req) => {
  const userId = req.params.id;

  if (!userId) {
    throw httpError(400, 'User ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw httpError(400, 'Invalid user ID');
  }

  return userId.toString();
};

const parsePagination = (req) => {
  const page = Math.max(
    Number.parseInt(req.query.page, 10) || 1,
    1
  );

  const requestedLimit =
    Number.parseInt(req.query.limit, 10) ||
    DEFAULT_LIMIT;

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
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
};

const sanitizeUser = (user) => {
  if (!user) return null;

  const data = user.toObject
    ? user.toObject()
    : { ...user };

  delete data.password;
  delete data.passwordHash;
  delete data.resetPasswordToken;
  delete data.resetPasswordExpires;

  return data;
};

/*
 * GET /api/users
 *
 * Returns users belonging to the current workspace.
 */
const list = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const {
      page,
      limit,
      skip,
    } = parsePagination(req);

    const filter = {
      companyId: workspaceId,
    };

    const status = trimmed(req.query.status);

    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            `Status must be one of: ${STATUSES.join(', ')}`,
        });
      }

      filter.status = status;
    }

    const search = trimmed(req.query.search);

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        'i'
      );

      filter.$or = [
        { name: regex },
        { email: regex },
        { designation: regex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(
          '-password -passwordHash -resetPasswordToken -resetPasswordExpires'
        )
        .populate('role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(
      total / limit
    );

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('List users error:', error);

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch users',
    });
  }
};

/*
 * GET /api/users/:id
 */
const getById = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const user = await User.findOne({
      _id: userId,
      companyId: workspaceId,
    })
      .select(
        '-password -passwordHash -resetPasswordToken -resetPasswordExpires'
      )
      .populate('role')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch user',
    });
  }
};

/*
 * UPDATE DESIGNATION / ROLE / STATUS
 *
 * Existing authentication fields are intentionally
 * not changed here.
 */
const update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const updateData = {};

    if (req.body.designation !== undefined) {
      updateData.designation =
        trimmed(req.body.designation) || null;
    }

    if (req.body.roleId !== undefined) {
      const roleId = trimmed(req.body.roleId);

      if (
        !mongoose.Types.ObjectId.isValid(roleId)
      ) {
        throw httpError(
          400,
          'Invalid role ID'
        );
      }

      /*
       * Verify the role exists.
       *
       * If your Role model has workspace/company
       * ownership, this query can be tightened later.
       */
      const role = await Role.findById(roleId)
        .select('_id')
        .lean();

      if (!role) {
        throw httpError(
          404,
          'Role not found'
        );
      }

      updateData.role = roleId;
    }

    if (req.body.status !== undefined) {
      const status = trimmed(req.body.status);

      if (!STATUSES.includes(status)) {
        throw httpError(
          400,
          `Status must be one of: ${STATUSES.join(', ')}`
        );
      }

      updateData.status = status;
    }

    if (!Object.keys(updateData).length) {
      throw httpError(
        400,
        'At least one valid user field is required'
      );
    }

    const user =
      await User.findOneAndUpdate(
        {
          _id: userId,
          companyId: workspaceId,
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .select(
          '-password -passwordHash -resetPasswordToken -resetPasswordExpires'
        )
        .populate('role');

    if (!user) {
      throw httpError(
        404,
        'User not found'
      );
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * DELETE /api/users/:id
 *
 * Soft delete.
 */
const remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    if (userId === req.userId) {
      throw httpError(
        400,
        'You cannot deactivate your own account'
      );
    }

    const user =
      await User.findOneAndUpdate(
        {
          _id: userId,
          companyId: workspaceId,
        },
        {
          $set: {
            status: 'inactive',
          },
        },
        {
          new: true,
        }
      )
        .select(
          '-password -passwordHash -resetPasswordToken -resetPasswordExpires'
        )
        .populate('role');

    if (!user) {
      throw httpError(
        404,
        'User not found'
      );
    }

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * PATCH /api/users/:id/restore
 */
const restore = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const user =
      await User.findOneAndUpdate(
        {
          _id: userId,
          companyId: workspaceId,
        },
        {
          $set: {
            status: 'active',
          },
        },
        {
          new: true,
        }
      )
        .select(
          '-password -passwordHash -resetPasswordToken -resetPasswordExpires'
        )
        .populate('role');

    if (!user) {
      throw httpError(
        404,
        'User not found'
      );
    }

    return res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
  getById,
  update,
  remove,
  restore,
};