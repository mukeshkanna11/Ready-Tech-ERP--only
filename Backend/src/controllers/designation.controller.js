const mongoose = require('mongoose');
const Designation = require('../models/Designation');
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
    throw httpError(400, 'Invalid designation ID');
  }

  return id;
};

const clean = (value) => {
  if (value === undefined || value === null) return undefined;

  const result = String(value).trim();

  return result || undefined;
};

const validateDepartment = async (departmentId, workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    throw httpError(400, 'Invalid department ID');
  }

  const department = await Department.findOne({
    _id: departmentId,
    workspaceId,
    status: 'active',
  })
    .select('_id name')
    .lean();

  if (!department) {
    throw httpError(404, 'Department not found');
  }

  return department;
};

// GET /api/designations
// Optional: ?departmentId=xxx
const list = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const status = clean(req.query.status) || 'active';
    const search = clean(req.query.search);
    const departmentId = clean(req.query.departmentId);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const filter = {
      workspaceId,
      status,
    };

    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw httpError(400, 'Invalid department ID');
      }

      filter.departmentId = departmentId;
    }

    if (search) {
      filter.name = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }

    const designations = await Designation.find(filter)
      .populate({
        path: 'departmentId',
        select: 'name status',
      })
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: designations,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/designations/:id
const getById = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const designation = await Designation.findOne({
      _id: id,
      workspaceId,
    })
      .populate({
        path: 'departmentId',
        select: 'name status',
      })
      .lean();

    if (!designation) {
      throw httpError(404, 'Designation not found');
    }

    return res.status(200).json({
      success: true,
      data: designation,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/designations
const create = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const name = clean(req.body.name);
    const departmentId = clean(req.body.departmentId);

    if (!name) {
      throw httpError(400, 'Designation name is required');
    }

    if (!departmentId) {
      throw httpError(400, 'Department is required');
    }

    await validateDepartment(departmentId, workspaceId);

    const designation = await Designation.create({
      workspaceId,
      departmentId,
      name,
      status: 'active',
    });

    const populatedDesignation = await Designation.findById(
      designation._id
    )
      .populate({
        path: 'departmentId',
        select: 'name status',
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: populatedDesignation,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A designation with this name already exists',
      });
    }

    return next(error);
  }
};

// PUT /api/designations/:id
const update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const updateData = {};

    if (req.body.name !== undefined) {
      const name = clean(req.body.name);

      if (!name) {
        throw httpError(400, 'Designation name is required');
      }

      updateData.name = name;
    }

    if (req.body.departmentId !== undefined) {
      const departmentId = clean(req.body.departmentId);

      if (!departmentId) {
        throw httpError(400, 'Department is required');
      }

      await validateDepartment(departmentId, workspaceId);

      updateData.departmentId = departmentId;
    }

    if (req.body.status !== undefined) {
      const status = clean(req.body.status);

      if (!['active', 'inactive'].includes(status)) {
        throw httpError(400, 'Invalid designation status');
      }

      updateData.status = status;
    }

    if (!Object.keys(updateData).length) {
      throw httpError(400, 'No valid fields to update');
    }

    const designation = await Designation.findOneAndUpdate(
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
    )
      .populate({
        path: 'departmentId',
        select: 'name status',
      });

    if (!designation) {
      throw httpError(404, 'Designation not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Designation updated successfully',
      data: designation,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A designation with this name already exists',
      });
    }

    return next(error);
  }
};

// DELETE /api/designations/:id
const remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const designation = await Designation.findOneAndUpdate(
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

    if (!designation) {
      throw httpError(404, 'Designation not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Designation deactivated successfully',
      data: designation,
    });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/designations/:id/restore
const restore = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getId(req);

    const designation = await Designation.findOneAndUpdate(
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

    if (!designation) {
      throw httpError(404, 'Designation not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Designation restored successfully',
      data: designation,
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