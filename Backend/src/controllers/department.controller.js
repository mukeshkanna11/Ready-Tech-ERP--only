const mongoose = require('mongoose');
const Department = require('../models/Department');
const httpError = require('../utils/httpError');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

const getWorkspaceId = (req) => {
  const workspaceId = req.companyId;

  if (!workspaceId) {
    throw httpError(403, 'No workspace is linked to this account');
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    throw httpError(403, 'Invalid workspace reference');
  }

  return workspaceId.toString();
};

const getId = (req) => {
  const id = req.params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'Invalid department ID');
  }

  return id;
};

const clean = (value) => {
  if (value === undefined || value === null) return undefined;

  const result = String(value).trim();

  return result || undefined;
};

// GET /api/departments
const list = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const status = clean(req.query.status) || 'active';
    const search = clean(req.query.search);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const filter = {
      workspaceId,
      status,
    };

    if (search) {
      filter.name = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }

    const departments = await Department.find(filter)
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/departments/:id
const getById = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const department = await Department.findOne({
      _id: id,
      workspaceId,
    }).lean();

    if (!department) {
      throw httpError(404, 'Department not found');
    }

    return res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/departments
const create = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const name = clean(req.body.name);

    if (!name) {
      throw httpError(400, 'Department name is required');
    }

    const department = await Department.create({
      workspaceId,
      name,
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name already exists',
      });
    }

    return next(error);
  }
};

// PUT /api/departments/:id
const update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const updateData = {};

    if (req.body.name !== undefined) {
      const name = clean(req.body.name);

      if (!name) {
        throw httpError(400, 'Department name is required');
      }

      updateData.name = name;
    }

    if (req.body.status !== undefined) {
      const status = clean(req.body.status);

      if (!['active', 'inactive'].includes(status)) {
        throw httpError(400, 'Invalid department status');
      }

      updateData.status = status;
    }

    if (!Object.keys(updateData).length) {
      throw httpError(400, 'No valid fields to update');
    }

    const department = await Department.findOneAndUpdate(
      {
        _id: id,
        workspaceId,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!department) {
      throw httpError(404, 'Department not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name already exists',
      });
    }

    return next(error);
  }
};

// DELETE /api/departments/:id
const remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const department = await Department.findOneAndUpdate(
      {
        _id: id,
        workspaceId,
      },
      {
        $set: {
          status: 'inactive',
        },
      },
      {
        new: true,
      }
    );

    if (!department) {
      throw httpError(404, 'Department not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Department deactivated successfully',
      data: department,
    });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/departments/:id/restore
const restore = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const department = await Department.findOneAndUpdate(
      {
        _id: id,
        workspaceId,
      },
      {
        $set: {
          status: 'active',
        },
      },
      {
        new: true,
      }
    );

    if (!department) {
      throw httpError(404, 'Department not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Department restored successfully',
      data: department,
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