const mongoose = require('mongoose');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const httpError = require('../utils/httpError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)([^\s.]+\.)+[^\s]{2,}$/i;

const STATUSES = ['active', 'inactive'];

const FIELDS = [
  'name',
  'legalName',
  'email',
  'phone',
  'website',
  'registrationNumber',
  'gstNumber',
  'currency',
  'logo',
  'status',
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Normalize string values.
 */
const trimmed = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const result = String(value).trim();

  return result || undefined;
};

/**
 * Build a clean address object.
 */
const buildAddress = (address = {}) => ({
  line1: trimmed(address.line1),
  line2: trimmed(address.line2),
  city: trimmed(address.city),
  state: trimmed(address.state),
  country: trimmed(address.country),
  postalCode: trimmed(address.postalCode),
});

/**
 * Pick only allowed company fields.
 *
 * workspaceId and createdBy are intentionally NOT accepted
 * from req.body. They are always controlled by the authenticated
 * backend context.
 */
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

  return data;
};

/**
 * Validate company payload.
 */
const validate = (payload = {}, { partial = false } = {}) => {
  // Company name
  if (!partial || payload.name !== undefined) {
    if (!trimmed(payload.name)) {
      throw httpError(400, 'Company name is required');
    }
  }

  // Email
  const email = trimmed(payload.email);

  if (email && !EMAIL_REGEX.test(email)) {
    throw httpError(400, 'A valid company email is required');
  }

  // Website
  const website = trimmed(payload.website);

  if (website && !URL_REGEX.test(website)) {
    throw httpError(400, 'A valid company website URL is required');
  }

  // Status
  if (payload.status !== undefined) {
    const status = trimmed(payload.status);

    if (!STATUSES.includes(status)) {
      throw httpError(
        400,
        `Status must be one of: ${STATUSES.join(', ')}`
      );
    }
  }

  // Currency
  if (payload.currency !== undefined) {
    const currency = trimmed(payload.currency);

    if (!currency || currency.length !== 3) {
      throw httpError(
        400,
        'Currency must be a valid 3-letter currency code'
      );
    }
  }

  // Address
  if (payload.address !== undefined) {
    if (
      payload.address === null ||
      typeof payload.address !== 'object' ||
      Array.isArray(payload.address)
    ) {
      throw httpError(400, 'Address must be a valid object');
    }
  }
};

/**
 * Resolve authenticated workspace ID.
 *
 * IMPORTANT:
 * req.companyId is the workspace/tenant ID.
 * It is NOT the individual Company._id.
 */
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

/**
 * Resolve :id from URL.
 *
 * This is the individual Company._id.
 */
const getRequestedCompanyId = (req) => {
  const companyId = req.params.id;

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

/**
 * Pagination helper.
 */
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

/**
 * Escape regex input used for search.
 */
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Convert Mongo duplicate-key errors to API errors.
 */
const asDuplicate = (error) => {
  if (error?.code === 11000) {
    const duplicateField =
      Object.keys(error.keyPattern || {})[0];

    if (duplicateField === 'gstNumber') {
      return httpError(
        409,
        'A company with this GST number already exists'
      );
    }

    return httpError(
      409,
      'A company with the provided unique value already exists'
    );
  }

  return error;
};

/**
 * POST /api/companies
 *
 * Create a company inside the authenticated workspace.
 *
 * workspaceId and createdBy are NEVER accepted from the client.
 */
const create = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    validate(req.body);

    const data = pickFields(req.body);

    // Tenant ownership is always determined by authentication.
    data.workspaceId = workspaceId;

    // Track creator when available.
    if (req.userId) {
      data.createdBy = req.userId;
    }

    const company = await Company.create(data);

    return res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error) {
    return next(asDuplicate(error));
  }
};

/**
 * GET /api/companies
 *
 * Returns ONLY companies belonging to the authenticated workspace.
 *
 * Supported query params:
 * ?status=active
 * ?search=ready
 * ?page=1
 * ?limit=20
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
      workspaceId,
    };

    // Status filter
    const status = trimmed(req.query.status);

    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${STATUSES.join(', ')}`,
        });
      }

      filter.status = status;
    }

    // Search filter
    const search = trimmed(req.query.search);

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        'i'
      );

      filter.$or = [
        { name: regex },
        { legalName: regex },
        { email: regex },
        { phone: regex },
        { registrationNumber: regex },
        { gstNumber: regex },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Company.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: companies,
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
    console.error('List companies error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
    });
  }
};

/**
 * GET /api/companies/me
 *
 * Compatibility endpoint.
 *
 * Since one workspace can have multiple companies,
 * this returns the oldest active company in the workspace.
 *
 * The frontend should eventually use GET /companies
 * and allow the user to select a company.
 */
const getCurrent = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const company = await Company.findOne({
      workspaceId,
      status: 'active',
    })
      .sort({
        createdAt: 1,
      })
      .populate({
        path: 'branches',
        options: {
          sort: {
            name: 1,
          },
        },
      })
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'No active company found in this workspace',
      });
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error(
      'Get current company error:',
      error
    );

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch current company',
    });
  }
};

/**
 * GET /api/companies/:id
 *
 * Get one company.
 *
 * SECURITY:
 * Both _id AND workspaceId are checked.
 *
 * Therefore another workspace can never access this company.
 */
const getById = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const companyId = getRequestedCompanyId(req);

    const company = await Company.findOne({
      _id: companyId,
      workspaceId,
    })
      .populate({
        path: 'branches',
        options: {
          sort: {
            name: 1,
          },
        },
      })
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Get company error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
    });
  }
};

/**
 * PUT /api/companies/:id
 *
 * Update a company belonging to the current workspace.
 */
const update = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const companyId = getRequestedCompanyId(req);

    validate(req.body, {
      partial: true,
    });

    const updateData = pickFields(req.body);

    if (!Object.keys(updateData).length) {
      throw httpError(
        400,
        'At least one valid company field is required'
      );
    }

    // IMPORTANT:
    // workspaceId is intentionally NOT taken from req.body.
    // The query itself enforces workspace ownership.
    const company = await Company.findOneAndUpdate(
      {
        _id: companyId,
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

    if (!company) {
      throw httpError(
        404,
        'Company not found'
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error) {
    return next(asDuplicate(error));
  }
};

/**
 * DELETE /api/companies/:id
 *
 * Soft delete.
 *
 * Company remains in database with status = inactive.
 */
const remove = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const companyId = getRequestedCompanyId(req);

    const company = await Company.findOneAndUpdate(
      {
        _id: companyId,
        workspaceId,
      },
      {
        $set: {
          status: 'inactive',
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!company) {
      throw httpError(
        404,
        'Company not found'
      );
    }

    // Deactivate related branches.
    await Branch.updateMany(
      {
        companyId,
      },
      {
        $set: {
          status: 'inactive',
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Company deactivated successfully',
      data: company,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/companies/:id/restore
 *
 * Restore company and its branches.
 */
const restore = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const companyId = getRequestedCompanyId(req);

    const company = await Company.findOneAndUpdate(
      {
        _id: companyId,
        workspaceId,
      },
      {
        $set: {
          status: 'active',
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!company) {
      throw httpError(
        404,
        'Company not found'
      );
    }

    // Restore related branches.
    await Branch.updateMany(
      {
        companyId,
      },
      {
        $set: {
          status: 'active',
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Company restored successfully',
      data: company,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  create,
  list,
  getCurrent,
  getById,
  update,
  remove,
  restore,
};