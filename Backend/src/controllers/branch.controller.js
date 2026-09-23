const mongoose = require('mongoose');

const Branch = require('../models/Branch');
const Company = require('../models/Company');
const httpError = require('../utils/httpError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUSES = ['active', 'inactive'];

const FIELDS = [
  'name',
  'code',
  'email',
  'phone',
  'status',
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const trimmed = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const result = String(value).trim();

  return result || undefined;
};

const parseBoolean = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  throw httpError(
    400,
    'isHeadOffice must be a boolean'
  );
};

const buildAddress = (address = {}) => ({
  line1: trimmed(address.line1),
  line2: trimmed(address.line2),
  city: trimmed(address.city),
  state: trimmed(address.state),
  country: trimmed(address.country),
  postalCode: trimmed(address.postalCode),
});

const pickFields = (payload = {}) => {
  const data = {};

  FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      data[field] = trimmed(payload[field]);
    }
  });

  if (payload.address !== undefined) {
    data.address = buildAddress(payload.address);
  }

  if (payload.isHeadOffice !== undefined) {
    data.isHeadOffice = parseBoolean(
      payload.isHeadOffice
    );
  }

  return data;
};

const validate = (
  payload = {},
  { partial = false } = {}
) => {
  if (!partial || payload.name !== undefined) {
    if (!trimmed(payload.name)) {
      throw httpError(
        400,
        'Branch name is required'
      );
    }
  }

  if (!partial || payload.code !== undefined) {
    if (!trimmed(payload.code)) {
      throw httpError(
        400,
        'Branch code is required'
      );
    }
  }

  const email = trimmed(payload.email);

  if (email && !EMAIL_REGEX.test(email)) {
    throw httpError(
      400,
      'A valid branch email is required'
    );
  }

  if (payload.status !== undefined) {
    const status = trimmed(payload.status);

    if (!STATUSES.includes(status)) {
      throw httpError(
        400,
        `Status must be one of: ${STATUSES.join(', ')}`
      );
    }
  }

  if (payload.address !== undefined) {
    if (
      payload.address === null ||
      typeof payload.address !== 'object' ||
      Array.isArray(payload.address)
    ) {
      throw httpError(
        400,
        'Address must be a valid object'
      );
    }
  }
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

const getRequestedBranchId = (req) => {
  const branchId = req.params.id;

  if (!branchId) {
    throw httpError(
      400,
      'Branch ID is required'
    );
  }

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    throw httpError(
      400,
      'Invalid branch ID'
    );
  }

  return branchId.toString();
};

const getRequestedCompanyId = (req) => {
  const companyId =
    req.body?.companyId ||
    req.query?.companyId ||
    req.params?.companyId;

  if (!companyId) {
    throw httpError(
      400,
      'Company ID is required'
    );
  }

  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw httpError(
      400,
      'Invalid company ID'
    );
  }

  return companyId.toString();
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

const asDuplicate = (error) => {
  if (error?.code !== 11000) {
    return error;
  }

  const keyPattern = error.keyPattern || {};

  if (keyPattern.companyId && keyPattern.code) {
    return httpError(
      409,
      'Branch code is already used in this company'
    );
  }

  if (
    keyPattern.companyId &&
    keyPattern.isHeadOffice
  ) {
    return httpError(
      409,
      'This company already has a head office branch'
    );
  }

  return httpError(
    409,
    'A branch with the provided unique value already exists'
  );
};

const getWorkspaceCompany = async (
  workspaceId,
  companyId
) => {
  const company = await Company.findOne({
    _id: companyId,
    workspaceId,
  })
    .select('_id status')
    .lean();

  if (!company) {
    throw httpError(
      404,
      'Company not found'
    );
  }

  return company;
};

const create = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const companyId = getRequestedCompanyId(req);

    validate(req.body);

    const company = await getWorkspaceCompany(
      workspaceId,
      companyId
    );

    if (company.status !== 'active') {
      throw httpError(
        403,
        'Cannot add a branch to an inactive company'
      );
    }

    const branch = await Branch.create({
      ...pickFields(req.body),
      companyId,
    });

    return res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch,
    });
  } catch (error) {
    return next(asDuplicate(error));
  }
};

const list = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const requestedCompanyId =
      req.query.companyId
        ? getRequestedCompanyId(req)
        : null;

    // If companyId is provided, verify it belongs
    // to the current workspace.
    if (requestedCompanyId) {
      await getWorkspaceCompany(
        workspaceId,
        requestedCompanyId
      );
    }

    const {
      page,
      limit,
      skip,
    } = parsePagination(req);

    let companyIds;

    if (requestedCompanyId) {
      companyIds = [requestedCompanyId];
    } else {
      // No companyId = get all companies
      // belonging to the current workspace.
      companyIds = await Company.find({
        workspaceId,
      })
        .select('_id')
        .lean()
        .then((companies) =>
          companies.map((company) => company._id)
        );
    }

    const filter = {
      companyId: {
        $in: companyIds,
      },
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
        { code: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [branches, total] =
      await Promise.all([
        Branch.find(filter)
          .sort({
            isHeadOffice: -1,
            createdAt: -1,
            name: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Branch.countDocuments(filter),
      ]);

    const totalPages = Math.ceil(
      total / limit
    );

    return res.status(200).json({
      success: true,
      data: branches,
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
    console.error('List branches error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch branches',
    });
  }
};
const getById = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getRequestedBranchId(req);

    const branch = await Branch.findById(id)
      .lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    await getWorkspaceCompany(
      workspaceId,
      branch.companyId
    );

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error('Get branch error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch branch',
    });
  }
};

const update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getRequestedBranchId(req);

    validate(req.body, {
      partial: true,
    });

    const existingBranch =
      await Branch.findById(id)
        .select('_id companyId')
        .lean();

    if (!existingBranch) {
      throw httpError(
        404,
        'Branch not found'
      );
    }

    await getWorkspaceCompany(
      workspaceId,
      existingBranch.companyId
    );

    const updateData =
      pickFields(req.body);

    if (!Object.keys(updateData).length) {
      throw httpError(
        400,
        'At least one valid branch field is required'
      );
    }

    const branch =
      await Branch.findOneAndUpdate(
        {
          _id: id,
          companyId:
            existingBranch.companyId,
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!branch) {
      throw httpError(
        404,
        'Branch not found'
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Branch updated successfully',
      data: branch,
    });
  } catch (error) {
    return next(asDuplicate(error));
  }
};

const remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getRequestedBranchId(req);

    const existingBranch =
      await Branch.findById(id)
        .select('_id companyId')
        .lean();

    if (!existingBranch) {
      throw httpError(
        404,
        'Branch not found'
      );
    }

    await getWorkspaceCompany(
      workspaceId,
      existingBranch.companyId
    );

    const branch =
      await Branch.findOneAndUpdate(
        {
          _id: id,
          companyId:
            existingBranch.companyId,
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

    if (!branch) {
      throw httpError(
        404,
        'Branch not found'
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Branch deactivated successfully',
      data: branch,
    });
  } catch (error) {
    return next(error);
  }
};

const restore = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const id = getRequestedBranchId(req);

    const existingBranch =
      await Branch.findById(id)
        .select('_id companyId')
        .lean();

    if (!existingBranch) {
      throw httpError(
        404,
        'Branch not found'
      );
    }

    await getWorkspaceCompany(
      workspaceId,
      existingBranch.companyId
    );

    const branch =
      await Branch.findOneAndUpdate(
        {
          _id: id,
          companyId:
            existingBranch.companyId,
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

    if (!branch) {
      throw httpError(
        404,
        'Branch not found'
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Branch restored successfully',
      data: branch,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  restore,
};