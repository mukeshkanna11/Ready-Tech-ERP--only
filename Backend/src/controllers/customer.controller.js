const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Branch = require('../models/Branch');
const Company = require('../models/Company');

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isValidObjectId = (id) =>
  Boolean(id) && mongoose.Types.ObjectId.isValid(id);

const cleanString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const optionalString = (value) => {
  const cleaned = cleanString(value);
  return cleaned || undefined;
};

const optionalUpperString = (value) => {
  const cleaned = cleanString(value);
  return cleaned ? cleaned.toUpperCase() : undefined;
};

const normalizeEmail = (value) => {
  const cleaned = cleanString(value);
  return cleaned ? cleaned.toLowerCase() : undefined;
};

const normalizeAddress = (address = {}) => ({
  line1: optionalString(
    address?.line1 ?? address?.addressLine1
  ),

  line2: optionalString(
    address?.line2 ?? address?.addressLine2
  ),

  city: optionalString(address?.city),

  state: optionalString(address?.state),

  country:
    optionalString(address?.country) ||
    'India',

  postalCode: optionalString(
    address?.postalCode
  ),
});

const normalizeContactPerson = (
  contactPerson = {}
) => ({
  name: optionalString(
    contactPerson?.name
  ),

  email: normalizeEmail(
    contactPerson?.email
  ),

  phone: optionalString(
    contactPerson?.phone
  ),

  designation: optionalString(
    contactPerson?.designation
  ),
});

const parseNonNegativeNumber = (
  value,
  defaultValue = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return defaultValue;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
};

const parseNonNegativeInteger = (
  value,
  defaultValue = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return defaultValue;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isInteger(number)
  ) {
    return null;
  }

  return number;
};

// --------------------------------------------------
// WORKSPACE
// --------------------------------------------------

const getWorkspaceId = (req) => {
  const workspaceId = req.companyId;

  if (!workspaceId) {
    return null;
  }

  if (!isValidObjectId(workspaceId)) {
    return null;
  }

  return workspaceId.toString();
};

// --------------------------------------------------
// BRANCH ACCESS
//
// req.companyId = workspace ID
// Branch.companyId = actual Company ID
// Company.workspaceId = workspace ID
// --------------------------------------------------

const validateBranchAccess = async (
  branchId,
  workspaceId
) => {
  if (
    branchId === undefined ||
    branchId === null ||
    cleanString(branchId) === ''
  ) {
    return {
      branch: null,
      company: null,
    };
  }

  const normalizedBranchId =
    cleanString(branchId);

  if (!isValidObjectId(normalizedBranchId)) {
    return {
      error: 'Invalid branch ID',
    };
  }

  const branch =
    await Branch.findById(
      normalizedBranchId
    )
      .select(
        '_id companyId name code'
      )
      .lean();

  if (!branch) {
    return {
      error: 'Branch not found',
    };
  }

  const company =
    await Company.findOne({
      _id: branch.companyId,
      workspaceId,
    })
      .select(
        '_id name status'
      )
      .lean();

  if (!company) {
    return {
      error:
        'Branch does not belong to your workspace',
    };
  }

  return {
    branch,
    company,
  };
};

// --------------------------------------------------
// POPULATE CUSTOMER
// --------------------------------------------------

const populateCustomer = (query) =>
  query
    .populate(
      'branchId',
      'name code'
    )
    .populate(
      'createdBy',
      'name email'
    )
    .populate(
      'updatedBy',
      'name email'
    );

// --------------------------------------------------
// DUPLICATE KEY MESSAGE
// --------------------------------------------------

const getDuplicateKeyMessage = (
  error
) => {
  const keyPattern =
    error?.keyPattern || {};

  const keyValue =
    error?.keyValue || {};

  if (keyPattern.customerCode) {
    return keyValue.customerCode
      ? `Customer code "${keyValue.customerCode}" already exists`
      : 'Customer code already exists';
  }

  if (keyPattern.gstNumber) {
    return keyValue.gstNumber
      ? `GST number "${keyValue.gstNumber}" already exists`
      : 'GST number already exists';
  }

  return 'Customer already exists';
};

// --------------------------------------------------
// CREATE CUSTOMER
// --------------------------------------------------

const createCustomer = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message:
          'Company/workspace is required',
      });
    }

    const {
      branchId,
      customerCode,
      name,
      displayName,
      customerType,
      email,
      phone,
      alternatePhone,
      website,
      gstNumber,
      panNumber,
      taxNumber,
      billingAddress,
      shippingAddress,
      contactPerson,
      creditLimit,
      paymentTerms,
      status,
      notes,
    } = req.body || {};

    // --------------------------------------------------
    // BASIC VALUES
    // --------------------------------------------------

    const normalizedCode =
      cleanString(
        customerCode
      ).toUpperCase();

    const normalizedName =
      cleanString(name);

    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        message:
          'Customer code is required',
      });
    }

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message:
          'Customer name is required',
      });
    }

    // --------------------------------------------------
    // CUSTOMER TYPE
    // --------------------------------------------------

    const normalizedCustomerType =
      cleanString(
        customerType
      ).toLowerCase() ||
      'business';

    if (
      ![
        'individual',
        'business',
      ].includes(
        normalizedCustomerType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid customer type',
      });
    }

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    const normalizedStatus =
      cleanString(
        status
      ).toLowerCase() ||
      'active';

    if (
      ![
        'active',
        'inactive',
      ].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid customer status',
      });
    }

    // --------------------------------------------------
    // CREDIT LIMIT
    // --------------------------------------------------

    const parsedCreditLimit =
      parseNonNegativeNumber(
        creditLimit,
        0
      );

    if (
      parsedCreditLimit === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Credit limit must be a valid non-negative number',
      });
    }

    // --------------------------------------------------
    // PAYMENT TERMS
    // --------------------------------------------------

    const parsedPaymentTerms =
      parseNonNegativeInteger(
        paymentTerms,
        0
      );

    if (
      parsedPaymentTerms === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Payment terms must be a valid non-negative number of days',
      });
    }

    // --------------------------------------------------
    // NORMALIZE GST
    //
    // Empty GST = undefined
    // This is important for partial unique index.
    // --------------------------------------------------

    const normalizedGST =
      optionalUpperString(
        gstNumber
      );

    const normalizedPAN =
      optionalUpperString(
        panNumber
      );

    const normalizedTaxNumber =
      optionalUpperString(
        taxNumber
      );

    // --------------------------------------------------
    // BRANCH VALIDATION
    // --------------------------------------------------

    let validatedBranch = null;

    if (
      branchId !== undefined &&
      branchId !== null &&
      cleanString(branchId)
    ) {
      const branchResult =
        await validateBranchAccess(
          branchId,
          workspaceId
        );

      if (branchResult.error) {
        return res.status(400).json({
          success: false,
          message:
            branchResult.error,
        });
      }

      validatedBranch =
        branchResult.branch;
    }

    // --------------------------------------------------
    // CUSTOMER CODE DUPLICATE CHECK
    // --------------------------------------------------

    const existingCode =
      await Customer.findOne({
        companyId:
          workspaceId,
        customerCode:
          normalizedCode,
      })
        .select('_id')
        .lean();

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message:
          'Customer code already exists',
      });
    }

    // --------------------------------------------------
    // GST DUPLICATE CHECK
    //
    // IMPORTANT:
    // This block NEVER runs for empty GST.
    // --------------------------------------------------

    if (normalizedGST) {
      const existingGST =
        await Customer.findOne({
          companyId:
            workspaceId,
          gstNumber:
            normalizedGST,
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

    // --------------------------------------------------
    // DEBUG
    // --------------------------------------------------

    console.log(
      'CUSTOMER CREATE:',
      {
        customerCode:
          normalizedCode,
        gstNumber:
          normalizedGST ||
          undefined,
        panNumber:
          normalizedPAN ||
          undefined,
        paymentTerms:
          parsedPaymentTerms,
        creditLimit:
          parsedCreditLimit,
        workspaceId,
      }
    );

    // --------------------------------------------------
    // CREATE CUSTOMER
    // --------------------------------------------------

    const customer =
      await Customer.create({
        companyId:
          workspaceId,

        branchId:
          validatedBranch?._id ||
          undefined,

        customerCode:
          normalizedCode,

        name:
          normalizedName,

        displayName:
          optionalString(
            displayName
          ),

        customerType:
          normalizedCustomerType,

        email:
          normalizeEmail(
            email
          ),

        phone:
          optionalString(
            phone
          ),

        alternatePhone:
          optionalString(
            alternatePhone
          ),

        website:
          optionalString(
            website
          ),

        gstNumber:
          normalizedGST,

        panNumber:
          normalizedPAN,

        taxNumber:
          normalizedTaxNumber,

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

        creditLimit:
          parsedCreditLimit,

        paymentTerms:
          parsedPaymentTerms,

        status:
          normalizedStatus,

        notes:
          optionalString(
            notes
          ),

        createdBy:
          userId,

        updatedBy:
          userId,
      });

    // --------------------------------------------------
    // POPULATED RESPONSE
    // --------------------------------------------------

    const populatedCustomer =
      await populateCustomer(
        Customer.findOne({
          _id:
            customer._id,
          companyId:
            workspaceId,
        })
      );

    return res.status(201).json({
      success: true,
      message:
        'Customer created successfully',
      data:
        populatedCustomer,
    });
  } catch (error) {
    console.error(
      'Create customer error:',
      error
    );

    // --------------------------------------------------
    // DUPLICATE KEY
    // --------------------------------------------------

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          getDuplicateKeyMessage(
            error
          ),
      });
    }

    // --------------------------------------------------
    // VALIDATION ERROR
    // --------------------------------------------------

    if (
      error?.name ===
      'ValidationError'
    ) {
      const errors =
        Object.values(
          error.errors || {}
        ).map(
          (item) =>
            item.message
        );

      return res.status(400).json({
        success: false,
        message:
          'Validation failed',
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to create customer',
    });
  }
};

// --------------------------------------------------
// GET ALL CUSTOMERS
// --------------------------------------------------

const getCustomers = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message:
          'Company/workspace is required',
      });
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      branchId,
      customerType,
    } = req.query;

    const parsedPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const parsedLimit =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        100
      );

    const skip =
      (parsedPage - 1) *
      parsedLimit;

    const filter = {
      companyId:
        workspaceId,
    };

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    if (status) {
      const normalizedStatus =
        cleanString(
          status
        ).toLowerCase();

      if (
        [
          'active',
          'inactive',
        ].includes(
          normalizedStatus
        )
      ) {
        filter.status =
          normalizedStatus;
      }
    }

    // --------------------------------------------------
    // CUSTOMER TYPE
    // --------------------------------------------------

    if (customerType) {
      const normalizedType =
        cleanString(
          customerType
        ).toLowerCase();

      if (
        [
          'individual',
          'business',
        ].includes(
          normalizedType
        )
      ) {
        filter.customerType =
          normalizedType;
      }
    }

    // --------------------------------------------------
    // BRANCH
    // --------------------------------------------------

    if (branchId) {
      const normalizedBranchId =
        cleanString(
          branchId
        );

      if (
        !isValidObjectId(
          normalizedBranchId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid branch ID',
        });
      }

      const branchResult =
        await validateBranchAccess(
          normalizedBranchId,
          workspaceId
        );

      if (branchResult.error) {
        return res.status(400).json({
          success: false,
          message:
            branchResult.error,
        });
      }

      filter.branchId =
        normalizedBranchId;
    }

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    const normalizedSearch =
      cleanString(search);

    if (normalizedSearch) {
      const escapedSearch =
        normalizedSearch.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const searchRegex =
        new RegExp(
          escapedSearch,
          'i'
        );

      filter.$or = [
        {
          customerCode:
            searchRegex,
        },
        {
          name:
            searchRegex,
        },
        {
          displayName:
            searchRegex,
        },
        {
          email:
            searchRegex,
        },
        {
          phone:
            searchRegex,
        },
        {
          gstNumber:
            searchRegex,
        },
        {
          panNumber:
            searchRegex,
        },
      ];
    }

    // --------------------------------------------------
    // FETCH
    // --------------------------------------------------

    const [
      customers,
      total,
    ] = await Promise.all([
      populateCustomer(
        Customer.find(filter)
      )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      Customer.countDocuments(
        filter
      ),
    ]);

    const totalPages =
      Math.ceil(
        total / parsedLimit
      );

    return res.status(200).json({
      success: true,
      data:
        customers,
      pagination: {
        page:
          parsedPage,
        limit:
          parsedLimit,
        total,
        totalPages,
        hasNextPage:
          parsedPage <
          totalPages,
        hasPreviousPage:
          parsedPage > 1,
      },
    });
  } catch (error) {
    console.error(
      'Get customers error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch customers',
    });
  }
};

// --------------------------------------------------
// GET CUSTOMER BY ID
// --------------------------------------------------

const getCustomerById =
  async (req, res) => {
    try {
      const workspaceId =
        getWorkspaceId(req);

      const { id } =
        req.params;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message:
            'Company/workspace is required',
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid customer ID',
        });
      }

      const customer =
        await populateCustomer(
          Customer.findOne({
            _id: id,
            companyId:
              workspaceId,
          })
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            'Customer not found',
        });
      }

      return res.status(200).json({
        success: true,
        data:
          customer,
      });
    } catch (error) {
      console.error(
        'Get customer error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch customer',
      });
    }
  };

// --------------------------------------------------
// UPDATE CUSTOMER
// --------------------------------------------------

const updateCustomer =
  async (req, res) => {
    try {
      const workspaceId =
        getWorkspaceId(req);

      const userId =
        req.userId;

      const { id } =
        req.params;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message:
            'Company/workspace is required',
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid customer ID',
        });
      }

      const customer =
        await Customer.findOne({
          _id: id,
          companyId:
            workspaceId,
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            'Customer not found',
        });
      }

      const {
        branchId,
        customerCode,
        name,
        displayName,
        customerType,
        email,
        phone,
        alternatePhone,
        website,
        gstNumber,
        panNumber,
        taxNumber,
        billingAddress,
        shippingAddress,
        contactPerson,
        creditLimit,
        paymentTerms,
        status,
        notes,
      } = req.body || {};

      // --------------------------------------------------
      // BRANCH
      // --------------------------------------------------

      if (
        branchId !== undefined
      ) {
        if (
          branchId === null ||
          cleanString(
            branchId
          ) === ''
        ) {
          customer.branchId =
            undefined;
        } else {
          const branchResult =
            await validateBranchAccess(
              branchId,
              workspaceId
            );

          if (
            branchResult.error
          ) {
            return res.status(400).json({
              success: false,
              message:
                branchResult.error,
            });
          }

          customer.branchId =
            branchResult.branch._id;
        }
      }

      // --------------------------------------------------
      // CUSTOMER CODE
      // --------------------------------------------------

      if (
        customerCode !==
        undefined
      ) {
        const normalizedCode =
          cleanString(
            customerCode
          ).toUpperCase();

        if (!normalizedCode) {
          return res.status(400).json({
            success: false,
            message:
              'Customer code cannot be empty',
          });
        }

        const duplicate =
          await Customer.findOne({
            companyId:
              workspaceId,
            customerCode:
              normalizedCode,
            _id: {
              $ne: id,
            },
          })
            .select('_id')
            .lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              'Customer code already exists',
          });
        }

        customer.customerCode =
          normalizedCode;
      }

      // --------------------------------------------------
      // NAME
      // --------------------------------------------------

      if (
        name !== undefined
      ) {
        const normalizedName =
          cleanString(name);

        if (!normalizedName) {
          return res.status(400).json({
            success: false,
            message:
              'Customer name cannot be empty',
          });
        }

        customer.name =
          normalizedName;
      }

      // --------------------------------------------------
      // DISPLAY NAME
      // --------------------------------------------------

      if (
        displayName !==
        undefined
      ) {
        customer.displayName =
          optionalString(
            displayName
          );
      }

      // --------------------------------------------------
      // CUSTOMER TYPE
      // --------------------------------------------------

      if (
        customerType !==
        undefined
      ) {
        const normalizedType =
          cleanString(
            customerType
          ).toLowerCase();

        if (
          ![
            'individual',
            'business',
          ].includes(
            normalizedType
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid customer type',
          });
        }

        customer.customerType =
          normalizedType;
      }

      // --------------------------------------------------
      // EMAIL
      // --------------------------------------------------

      if (
        email !== undefined
      ) {
        customer.email =
          normalizeEmail(
            email
          );
      }

      // --------------------------------------------------
      // PHONE
      // --------------------------------------------------

      if (
        phone !== undefined
      ) {
        customer.phone =
          optionalString(
            phone
          );
      }

      // --------------------------------------------------
      // ALTERNATE PHONE
      // --------------------------------------------------

      if (
        alternatePhone !==
        undefined
      ) {
        customer.alternatePhone =
          optionalString(
            alternatePhone
          );
      }

      // --------------------------------------------------
      // WEBSITE
      // --------------------------------------------------

      if (
        website !== undefined
      ) {
        customer.website =
          optionalString(
            website
          );
      }

      // --------------------------------------------------
      // GST
      // --------------------------------------------------

      if (
        gstNumber !==
        undefined
      ) {
        const normalizedGST =
          optionalUpperString(
            gstNumber
          );

        if (normalizedGST) {
          const duplicateGST =
            await Customer.findOne({
              companyId:
                workspaceId,
              gstNumber:
                normalizedGST,
              _id: {
                $ne: id,
              },
            })
              .select('_id')
              .lean();

          if (duplicateGST) {
            return res.status(409).json({
              success: false,
              message:
                'GST number already exists',
            });
          }
        }

        customer.gstNumber =
          normalizedGST;
      }

      // --------------------------------------------------
      // PAN
      // --------------------------------------------------

      if (
        panNumber !==
        undefined
      ) {
        customer.panNumber =
          optionalUpperString(
            panNumber
          );
      }

      // --------------------------------------------------
      // TAX NUMBER
      // --------------------------------------------------

      if (
        taxNumber !==
        undefined
      ) {
        customer.taxNumber =
          optionalUpperString(
            taxNumber
          );
      }

      // --------------------------------------------------
      // ADDRESSES
      // --------------------------------------------------

      if (
        billingAddress !==
        undefined
      ) {
        customer.billingAddress =
          normalizeAddress(
            billingAddress
          );
      }

      if (
        shippingAddress !==
        undefined
      ) {
        customer.shippingAddress =
          normalizeAddress(
            shippingAddress
          );
      }

      // --------------------------------------------------
      // CONTACT PERSON
      // --------------------------------------------------

      if (
        contactPerson !==
        undefined
      ) {
        customer.contactPerson =
          normalizeContactPerson(
            contactPerson
          );
      }

      // --------------------------------------------------
      // CREDIT LIMIT
      // --------------------------------------------------

      if (
        creditLimit !==
        undefined
      ) {
        const value =
          parseNonNegativeNumber(
            creditLimit,
            0
          );

        if (value === null) {
          return res.status(400).json({
            success: false,
            message:
              'Credit limit must be a valid non-negative number',
          });
        }

        customer.creditLimit =
          value;
      }

      // --------------------------------------------------
      // PAYMENT TERMS
      // --------------------------------------------------

      if (
        paymentTerms !==
        undefined
      ) {
        const value =
          parseNonNegativeInteger(
            paymentTerms,
            0
          );

        if (value === null) {
          return res.status(400).json({
            success: false,
            message:
              'Payment terms must be a valid non-negative number of days',
          });
        }

        customer.paymentTerms =
          value;
      }

      // --------------------------------------------------
      // STATUS
      // --------------------------------------------------

      if (
        status !==
        undefined
      ) {
        const normalizedStatus =
          cleanString(
            status
          ).toLowerCase();

        if (
          ![
            'active',
            'inactive',
          ].includes(
            normalizedStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid customer status',
          });
        }

        customer.status =
          normalizedStatus;
      }

      // --------------------------------------------------
      // NOTES
      // --------------------------------------------------

      if (
        notes !==
        undefined
      ) {
        customer.notes =
          optionalString(
            notes
          );
      }

      // --------------------------------------------------
      // AUDIT
      // --------------------------------------------------

      customer.updatedBy =
        userId;

      await customer.save();

      // --------------------------------------------------
      // UPDATED RESPONSE
      // --------------------------------------------------

      const updatedCustomer =
        await populateCustomer(
          Customer.findOne({
            _id:
              customer._id,
            companyId:
              workspaceId,
          })
        );

      return res.status(200).json({
        success: true,
        message:
          'Customer updated successfully',
        data:
          updatedCustomer,
      });
    } catch (error) {
      console.error(
        'Update customer error:',
        error
      );

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            getDuplicateKeyMessage(
              error
            ),
        });
      }

      if (
        error?.name ===
        'ValidationError'
      ) {
        const errors =
          Object.values(
            error.errors || {}
          ).map(
            (item) =>
              item.message
          );

        return res.status(400).json({
          success: false,
          message:
            'Validation failed',
          errors,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          'Failed to update customer',
      });
    }
  };

// --------------------------------------------------
// DELETE CUSTOMER
// --------------------------------------------------

const deleteCustomer =
  async (req, res) => {
    try {
      const workspaceId =
        getWorkspaceId(req);

      const { id } =
        req.params;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message:
            'Company/workspace is required',
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid customer ID',
        });
      }

      const customer =
        await Customer.findOne({
          _id: id,
          companyId:
            workspaceId,
        })
          .select('_id')
          .lean();

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            'Customer not found',
        });
      }

      await Customer.deleteOne({
        _id: id,
        companyId:
          workspaceId,
      });

      return res.status(200).json({
        success: true,
        message:
          'Customer deleted successfully',
      });
    } catch (error) {
      console.error(
        'Delete customer error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to delete customer',
      });
    }
  };

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};