const mongoose = require('mongoose');

const Vendor = require('../models/Vendor');
const Branch = require('../models/Branch');
const Company = require('../models/Company');

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const getWorkspaceId = (req) => {
  const workspaceId = req.companyId;

  if (!workspaceId) {
    const error = new Error(
      'No workspace is linked to this account'
    );

    error.statusCode = 403;
    throw error;
  }

  if (!isValidObjectId(workspaceId)) {
    const error = new Error(
      'Invalid workspace reference'
    );

    error.statusCode = 403;
    throw error;
  }

  return workspaceId.toString();
};

const normalizeAddress = (address = {}) => {
  return {
    addressLine1:
      address.addressLine1 == null
        ? ''
        : String(address.addressLine1).trim(),

    addressLine2:
      address.addressLine2 == null
        ? ''
        : String(address.addressLine2).trim(),

    city:
      address.city == null
        ? ''
        : String(address.city).trim(),

    state:
      address.state == null
        ? ''
        : String(address.state).trim(),

    postalCode:
      address.postalCode == null
        ? ''
        : String(address.postalCode).trim(),

    country:
      address.country == null ||
      String(address.country).trim() === ''
        ? 'India'
        : String(address.country).trim(),
  };
};

const normalizeContactPerson = (
  contactPerson = {}
) => {
  return {
    name:
      contactPerson.name == null
        ? ''
        : String(contactPerson.name).trim(),

    designation:
      contactPerson.designation == null
        ? ''
        : String(contactPerson.designation).trim(),

    email:
      contactPerson.email == null
        ? ''
        : String(contactPerson.email)
            .trim()
            .toLowerCase(),

    phone:
      contactPerson.phone == null
        ? ''
        : String(contactPerson.phone).trim(),
  };
};

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeVendorCode = (value) => {
  return normalizeString(value).toUpperCase();
};

const normalizeEmail = (value) => {
  return normalizeString(value).toLowerCase();
};

const normalizeGST = (value) => {
  return normalizeString(value).toUpperCase();
};

const normalizePAN = (value) => {
  return normalizeString(value).toUpperCase();
};

const getBranchIdFromRequest = (req) => {
  if (
    req.body &&
    Object.prototype.hasOwnProperty.call(
      req.body,
      'branchId'
    )
  ) {
    return req.body.branchId;
  }

  return undefined;
};

/*
 * Validate that a branch belongs to the current
 * authenticated workspace.
 *
 * Branch.companyId -> actual Company._id
 * Company.workspaceId -> authenticated workspace
 */
const validateBranchForWorkspace = async (
  branchId,
  workspaceId
) => {
  if (
    branchId === null ||
    branchId === undefined ||
    branchId === ''
  ) {
    return null;
  }

  if (!isValidObjectId(branchId)) {
    const error = new Error(
      'Invalid branch ID'
    );

    error.statusCode = 400;
    throw error;
  }

  const branch = await Branch.findById(branchId)
    .select('_id companyId name status')
    .lean();

  if (!branch) {
    const error = new Error(
      'Branch not found'
    );

    error.statusCode = 400;
    throw error;
  }

  const company = await Company.findOne({
    _id: branch.companyId,
    workspaceId,
  })
    .select('_id status')
    .lean();

  if (!company) {
    const error = new Error(
      'Branch does not belong to your workspace'
    );

    error.statusCode = 400;
    throw error;
  }

  return branch;
};

const sendError = (res, error, fallback) => {
  console.error(
    'Vendor controller error:',
    error
  );

  const statusCode =
    error?.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      error?.message || fallback,
  });
};

// ============================================================
// CREATE VENDOR
// ============================================================

const createVendor = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = req.userId || null;

    const {
      customerCode,
      vendorCode,
      name,
      displayName,
      vendorType,
      email,
      phone,
      alternatePhone,
      website,
      gstNumber,
      panNumber,
      taxNumber,
      creditLimit,
      paymentTerms,
      billingAddress,
      shippingAddress,
      contactPerson,
      notes,
      status,
    } = req.body || {};

    /*
     * Support only vendorCode.
     *
     * customerCode is intentionally ignored but accepted
     * defensively so an accidental frontend field does not
     * break the request.
     */
    const finalVendorCode =
      normalizeVendorCode(
        vendorCode || customerCode
      );

    const finalName =
      normalizeString(name);

    if (!finalVendorCode) {
      return res.status(400).json({
        success: false,
        message: 'Vendor code is required',
      });
    }

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: 'Vendor name is required',
      });
    }

    const finalVendorType =
      normalizeString(vendorType).toLowerCase() ||
      'business';

    if (
      !['business', 'individual'].includes(
        finalVendorType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Vendor type must be business or individual',
      });
    }

    const finalStatus =
      normalizeString(status).toLowerCase() ||
      'active';

    if (
      !['active', 'inactive'].includes(
        finalStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be active or inactive',
      });
    }

    let finalCreditLimit = 0;

    if (
      creditLimit !== null &&
      creditLimit !== undefined &&
      creditLimit !== ''
    ) {
      finalCreditLimit = Number(
        creditLimit
      );

      if (
        Number.isNaN(finalCreditLimit) ||
        finalCreditLimit < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Credit limit must be a valid positive number',
        });
      }
    }

    const finalVendorEmail =
      normalizeEmail(email);

    const finalGST =
      normalizeGST(gstNumber);

    const finalPAN =
      normalizePAN(panNumber);

    /*
     * Validate branch before creating vendor.
     */
    const branchId =
      getBranchIdFromRequest(req);

    await validateBranchForWorkspace(
      branchId,
      workspaceId
    );

    /*
     * Duplicate vendor code check.
     */
    const existingVendor =
      await Vendor.findOne({
        companyId: workspaceId,
        vendorCode: finalVendorCode,
        deletedAt: null,
      })
        .select('_id')
        .lean();

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message:
          'Vendor code already exists',
      });
    }

    /*
     * Duplicate GST check.
     */
    if (finalGST) {
      const existingGST =
        await Vendor.findOne({
          companyId: workspaceId,
          gstNumber: finalGST,
          deletedAt: null,
        })
          .select('_id')
          .lean();

      if (existingGST) {
        return res.status(409).json({
          success: false,
          message:
            'GST number already exists',
        });
      }
    }

    const vendor =
      await Vendor.create({
        companyId: workspaceId,

        branchId:
          branchId || null,

        vendorCode:
          finalVendorCode,

        name:
          finalName,

        displayName:
          normalizeString(displayName),

        vendorType:
          finalVendorType,

        email:
          finalVendorEmail,

        phone:
          normalizeString(phone),

        alternatePhone:
          normalizeString(alternatePhone),

        website:
          normalizeString(website),

        gstNumber:
          finalGST,

        panNumber:
          finalPAN,

        taxNumber:
          normalizeString(taxNumber),

        creditLimit:
          finalCreditLimit,

        paymentTerms:
          paymentTerms === null ||
          paymentTerms === undefined
            ? ''
            : String(paymentTerms).trim(),

        billingAddress:
          normalizeAddress(
            billingAddress
          ),

        shippingAddress:
          normalizeAddress(
            shippingAddress
          ),

        contactPerson:
          normalizeContactPerson(
            contactPerson
          ),

        notes:
          normalizeString(notes),

        status:
          finalStatus,

        createdBy:
          userId,

        updatedBy:
          userId,
      });

    const populatedVendor =
      await Vendor.findOne({
        _id: vendor._id,
        companyId: workspaceId,
      })
        .populate({
          path: 'branchId',
          select:
            '_id name branchName code status',
        })
        .populate({
          path: 'createdBy',
          select:
            '_id name email',
        })
        .populate({
          path: 'updatedBy',
          select:
            '_id name email',
        })
        .lean();

    return res.status(201).json({
      success: true,
      message:
        'Vendor created successfully',
      data: populatedVendor,
    });
  } catch (error) {
    /*
     * Mongo duplicate key protection.
     */
    if (error?.code === 11000) {
      const duplicateFields =
        Object.keys(
          error.keyPattern || {}
        );

      if (
        duplicateFields.includes(
          'vendorCode'
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'Vendor code already exists',
        });
      }

      if (
        duplicateFields.includes(
          'gstNumber'
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'GST number already exists',
        });
      }
    }

    return sendError(
      res,
      error,
      'Unable to create vendor'
    );
  }
};

// ============================================================
// LIST VENDORS
// ============================================================

const getVendors = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 10,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const search =
      normalizeString(
        req.query.search
      );

    const status =
      normalizeString(
        req.query.status
      ).toLowerCase();

    const vendorType =
      normalizeString(
        req.query.vendorType
      ).toLowerCase();

    const branchId =
      normalizeString(
        req.query.branchId
      );

    const filter = {
      companyId: workspaceId,
      deletedAt: null,
    };

    if (
      status &&
      ['active', 'inactive'].includes(
        status
      )
    ) {
      filter.status = status;
    }

    if (
      vendorType &&
      ['business', 'individual'].includes(
        vendorType
      )
    ) {
      filter.vendorType =
        vendorType;
    }

    if (branchId) {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid branch ID',
        });
      }

      await validateBranchForWorkspace(
        branchId,
        workspaceId
      );

      filter.branchId = branchId;
    }

    if (search) {
      const escapedSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const regex = new RegExp(
        escapedSearch,
        'i'
      );

      filter.$or = [
        {
          vendorCode: regex,
        },
        {
          name: regex,
        },
        {
          displayName: regex,
        },
        {
          email: regex,
        },
        {
          phone: regex,
        },
        {
          gstNumber: regex,
        },
        {
          panNumber: regex,
        },
      ];
    }

    const [
      vendors,
      total,
    ] = await Promise.all([
      Vendor.find(filter)
        .populate({
          path: 'branchId',
          select:
            '_id name branchName code status',
        })
        .populate({
          path: 'createdBy',
          select:
            '_id name email',
        })
        .populate({
          path: 'updatedBy',
          select:
            '_id name email',
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Vendor.countDocuments(filter),
    ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        pages: totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to fetch vendors'
    );
  }
};

// ============================================================
// GET SINGLE VENDOR
// ============================================================

const getVendorById = async (
  req,
  res
) => {
  try {
    const workspaceId = getWorkspaceId(
      req
    );

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor =
      await Vendor.findOne({
        _id: id,
        companyId: workspaceId,
        deletedAt: null,
      })
        .populate({
          path: 'branchId',
          select:
            '_id name branchName code status',
        })
        .populate({
          path: 'createdBy',
          select:
            '_id name email',
        })
        .populate({
          path: 'updatedBy',
          select:
            '_id name email',
        })
        .lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to fetch vendor'
    );
  }
};

// ============================================================
// UPDATE VENDOR
// ============================================================

const updateVendor = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor =
      await Vendor.findOne({
        _id: id,
        companyId: workspaceId,
        deletedAt: null,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const body = req.body || {};

    /*
     * Vendor code
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'vendorCode'
      )
    ) {
      const newVendorCode =
        normalizeVendorCode(
          body.vendorCode
        );

      if (!newVendorCode) {
        return res.status(400).json({
          success: false,
          message:
            'Vendor code cannot be empty',
        });
      }

      if (
        newVendorCode !==
        vendor.vendorCode
      ) {
        const duplicate =
          await Vendor.findOne({
            _id: {
              $ne: id,
            },
            companyId: workspaceId,
            vendorCode:
              newVendorCode,
            deletedAt: null,
          })
            .select('_id')
            .lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              'Vendor code already exists',
          });
        }
      }

      vendor.vendorCode =
        newVendorCode;
    }

    /*
     * Name
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'name'
      )
    ) {
      const name =
        normalizeString(
          body.name
        );

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            'Vendor name cannot be empty',
        });
      }

      vendor.name = name;
    }

    /*
     * Simple string fields
     */
    const stringFields = [
      'displayName',
      'phone',
      'alternatePhone',
      'website',
      'taxNumber',
      'notes',
    ];

    stringFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        vendor[field] =
          normalizeString(
            body[field]
          );
      }
    });

    /*
     * Email
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'email'
      )
    ) {
      vendor.email =
        normalizeEmail(
          body.email
        );
    }

    /*
     * Vendor type
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'vendorType'
      )
    ) {
      const vendorType =
        normalizeString(
          body.vendorType
        ).toLowerCase();

      if (
        ![
          'business',
          'individual',
        ].includes(vendorType)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Vendor type must be business or individual',
        });
      }

      vendor.vendorType =
        vendorType;
    }

    /*
     * GST
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'gstNumber'
      )
    ) {
      const gst =
        normalizeGST(
          body.gstNumber
        );

      if (gst) {
        const duplicate =
          await Vendor.findOne({
            _id: {
              $ne: id,
            },
            companyId: workspaceId,
            gstNumber: gst,
            deletedAt: null,
          })
            .select('_id')
            .lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              'GST number already exists',
          });
        }
      }

      vendor.gstNumber = gst;
    }

    /*
     * PAN
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'panNumber'
      )
    ) {
      vendor.panNumber =
        normalizePAN(
          body.panNumber
        );
    }

    /*
     * Credit limit
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'creditLimit'
      )
    ) {
      if (
        body.creditLimit === '' ||
        body.creditLimit === null ||
        body.creditLimit === undefined
      ) {
        vendor.creditLimit = 0;
      } else {
        const creditLimit =
          Number(
            body.creditLimit
          );

        if (
          Number.isNaN(
            creditLimit
          ) ||
          creditLimit < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Credit limit must be a valid positive number',
          });
        }

        vendor.creditLimit =
          creditLimit;
      }
    }

    /*
     * Payment terms
     *
     * Always normalize safely.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'paymentTerms'
      )
    ) {
      vendor.paymentTerms =
        body.paymentTerms ===
          null ||
        body.paymentTerms ===
          undefined
          ? ''
          : String(
              body.paymentTerms
            ).trim();
    }

    /*
     * Addresses
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'billingAddress'
      )
    ) {
      vendor.billingAddress =
        normalizeAddress(
          body.billingAddress
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'shippingAddress'
      )
    ) {
      vendor.shippingAddress =
        normalizeAddress(
          body.shippingAddress
        );
    }

    /*
     * Contact person
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'contactPerson'
      )
    ) {
      vendor.contactPerson =
        normalizeContactPerson(
          body.contactPerson
        );
    }

    /*
     * Status
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'status'
      )
    ) {
      const status =
        normalizeString(
          body.status
        ).toLowerCase();

      if (
        ![
          'active',
          'inactive',
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Status must be active or inactive',
        });
      }

      vendor.status = status;
    }

    /*
     * Branch
     *
     * IMPORTANT:
     * Only validate when branchId is actually
     * supplied in the update request.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'branchId'
      )
    ) {
      if (
        body.branchId === null ||
        body.branchId === ''
      ) {
        vendor.branchId = null;
      } else {
        await validateBranchForWorkspace(
          body.branchId,
          workspaceId
        );

        vendor.branchId =
          body.branchId;
      }
    }

    vendor.updatedBy =
      userId;

    await vendor.save();

    const updatedVendor =
      await Vendor.findOne({
        _id: vendor._id,
        companyId: workspaceId,
        deletedAt: null,
      })
        .populate({
          path: 'branchId',
          select:
            '_id name branchName code status',
        })
        .populate({
          path: 'createdBy',
          select:
            '_id name email',
        })
        .populate({
          path: 'updatedBy',
          select:
            '_id name email',
        })
        .lean();

    return res.status(200).json({
      success: true,
      message:
        'Vendor updated successfully',
      data: updatedVendor,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateFields =
        Object.keys(
          error.keyPattern || {}
        );

      if (
        duplicateFields.includes(
          'vendorCode'
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'Vendor code already exists',
        });
      }

      if (
        duplicateFields.includes(
          'gstNumber'
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'GST number already exists',
        });
      }
    }

    return sendError(
      res,
      error,
      'Unable to update vendor'
    );
  }
};

// ============================================================
// DELETE VENDOR
// ============================================================

const deleteVendor = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor =
      await Vendor.findOne({
        _id: id,
        companyId: workspaceId,
        deletedAt: null,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    /*
     * Soft delete.
     */
    vendor.deletedAt =
      new Date();

    vendor.deletedBy =
      userId;

    vendor.updatedBy =
      userId;

    await vendor.save();

    return res.status(200).json({
      success: true,
      message:
        'Vendor deleted successfully',
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to delete vendor'
    );
  }
};

// ============================================================
// RESTORE VENDOR
// ============================================================

const restoreVendor = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor =
      await Vendor.findOne({
        _id: id,
        companyId: workspaceId,
        deletedAt: {
          $ne: null,
        },
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          'Deleted vendor not found',
      });
    }

    /*
     * Make sure restored vendor does not
     * conflict with another active vendor.
     */
    const duplicateCode =
      await Vendor.findOne({
        _id: {
          $ne: id,
        },
        companyId: workspaceId,
        vendorCode:
          vendor.vendorCode,
        deletedAt: null,
      })
        .select('_id')
        .lean();

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message:
          'Cannot restore vendor because the vendor code is already in use',
      });
    }

    if (vendor.gstNumber) {
      const duplicateGST =
        await Vendor.findOne({
          _id: {
            $ne: id,
          },
          companyId: workspaceId,
          gstNumber:
            vendor.gstNumber,
          deletedAt: null,
        })
          .select('_id')
          .lean();

      if (duplicateGST) {
        return res.status(409).json({
          success: false,
          message:
            'Cannot restore vendor because the GST number is already in use',
        });
      }
    }

    vendor.deletedAt = null;
    vendor.deletedBy = null;
    vendor.updatedBy = userId;

    await vendor.save();

    return res.status(200).json({
      success: true,
      message:
        'Vendor restored successfully',
      data: vendor,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to restore vendor'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  restoreVendor,
};