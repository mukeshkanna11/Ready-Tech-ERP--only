const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

const getWorkspaceId = (req) => {
  if (!req.companyId) {
    throw new Error('Workspace is not available in authentication context');
  }

  return req.companyId;
};

const getCompany = async (req) => {
  const workspaceId = getWorkspaceId(req);

  const company = await Company.findOne({
    workspaceId,
    status: 'active',
  })
    .select('_id workspaceId name currency status')
    .lean();

  if (!company) {
    const directCompany = await Company.findOne({
      _id: workspaceId,
      status: 'active',
    })
      .select('_id workspaceId name currency status')
      .lean();

    if (!directCompany) {
      throw new Error('Active company not found');
    }

    return directCompany;
  }

  return company;
};

const getCompanyId = async (req) => {
  const company = await getCompany(req);
  return company._id;
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const roundNumber = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
};

const validateCustomer = async (customerId, workspaceId) => {
  if (!customerId || !isValidObjectId(customerId)) {
    throw new Error('Valid customerId is required');
  }

  const customer = await Customer.findOne({
    _id: customerId,
    companyId: workspaceId,
    deletedAt: null,
  }).lean();

  if (!customer) {
    throw new Error('Customer not found in your workspace');
  }

  return customer;
};

const validateBranch = async (branchId, companyId) => {
  if (!branchId) {
    return null;
  }

  if (!isValidObjectId(branchId)) {
    throw new Error('Invalid branchId');
  }

  const branch = await Branch.findOne({
    _id: branchId,
    companyId,
    deletedAt: null,
  }).lean();

  if (!branch) {
    throw new Error('Branch not found in your company');
  }

  return branch;
};

const validateProducts = async (items, companyId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one quotation item is required');
  }

  const productIds = items.map((item) => item.productId);

  const invalidId = productIds.find(
    (id) => !id || !isValidObjectId(id)
  );

  if (invalidId) {
    throw new Error('Every quotation item must contain a valid productId');
  }

  const products = await Product.find({
    _id: { $in: productIds },
    companyId,
    deletedAt: null,
  }).lean();

  const productMap = new Map(
    products.map((product) => [
      String(product._id),
      product,
    ])
  );

  for (const item of items) {
    const product = productMap.get(String(item.productId));

    if (!product) {
      throw new Error(
        `Product ${item.productId} not found in your company`
      );
    }
  }

  return productMap;
};

const prepareItems = (items, productMap) => {
  return items.map((item) => {
    const product = productMap.get(String(item.productId));

    const quantity = normalizeNumber(item.quantity, 0);

    if (quantity <= 0) {
      throw new Error(
        `Quantity must be greater than 0 for ${product.name || 'product'}`
      );
    }

    const unitPrice = Math.max(
      0,
      normalizeNumber(
        item.unitPrice !== undefined
          ? item.unitPrice
          : product.sellingPrice !== undefined
          ? product.sellingPrice
          : product.price,
        0
      )
    );

    const discountPercent = Math.min(
      100,
      Math.max(
        0,
        normalizeNumber(item.discountPercent, 0)
      )
    );

    const taxPercent = Math.max(
      0,
      normalizeNumber(
        item.taxPercent !== undefined
          ? item.taxPercent
          : product.gstRate !== undefined
          ? product.gstRate
          : product.taxRate,
        0
      )
    );

    const grossAmount = roundNumber(
      quantity * unitPrice
    );

    const discountAmount = roundNumber(
      (grossAmount * discountPercent) / 100
    );

    const taxableAmount = roundNumber(
      grossAmount - discountAmount
    );

    const taxAmount = roundNumber(
      (taxableAmount * taxPercent) / 100
    );

    const lineTotal = roundNumber(
      taxableAmount + taxAmount
    );

    return {
      productId: product._id,

      productCode:
        item.productCode ||
        product.productCode ||
        '',

      sku:
        item.sku ||
        product.sku ||
        '',

      productName:
        item.productName ||
        product.displayName ||
        product.name ||
        'Product',

      description:
        item.description ||
        product.description ||
        '',

      quantity,

      unit:
        item.unit ||
        product.unit ||
        'PCS',

      unitPrice,

      discountPercent,

      discountAmount,

      taxableAmount,

      taxPercent,

      taxAmount,

      lineTotal,
    };
  });
};

const calculateTotals = (
  items,
  shippingAmount = 0,
  otherCharges = 0,
  adjustmentAmount = 0
) => {
  const subtotal = roundNumber(
    items.reduce(
      (sum, item) =>
        sum +
        roundNumber(item.quantity * item.unitPrice),
      0
    )
  );

  const discountAmount = roundNumber(
    items.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    )
  );

  const taxableAmount = roundNumber(
    items.reduce(
      (sum, item) => sum + item.taxableAmount,
      0
    )
  );

  const taxAmount = roundNumber(
    items.reduce(
      (sum, item) => sum + item.taxAmount,
      0
    )
  );

  const shipping = Math.max(
    0,
    normalizeNumber(shippingAmount, 0)
  );

  const charges = Math.max(
    0,
    normalizeNumber(otherCharges, 0)
  );

  const adjustment = normalizeNumber(
    adjustmentAmount,
    0
  );

  const grandTotal = Math.max(
    0,
    roundNumber(
      taxableAmount +
        taxAmount +
        shipping +
        charges +
        adjustment
    )
  );

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    shippingAmount: roundNumber(shipping),
    otherCharges: roundNumber(charges),
    adjustmentAmount: roundNumber(adjustment),
    grandTotal,
  };
};

const generateQuotationNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const prefix = `QT-${year}-`;

  const latestQuotation = await Quotation.findOne({
    companyId,
    quotationNumber: {
      $regex: `^${prefix}`,
      $options: 'i',
    },
  })
    .sort({ quotationNumber: -1 })
    .select('quotationNumber')
    .lean();

  let nextNumber = 1;

  if (latestQuotation?.quotationNumber) {
    const lastNumber = parseInt(
      latestQuotation.quotationNumber.replace(prefix, ''),
      10
    );

    if (Number.isFinite(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

const sanitizeAddress = (address = {}) => {
  return {
    line1: address.line1 || '',
    line2: address.line2 || '',
    city: address.city || '',
    state: address.state || '',
    country: address.country || 'India',
    postalCode: address.postalCode || '',
  };
};

const getCustomerAddress = (customer) => {
  if (!customer) {
    return {};
  }

  if (customer.address) {
    return sanitizeAddress(customer.address);
  }

  return sanitizeAddress({
    line1: customer.addressLine1,
    line2: customer.addressLine2,
    city: customer.city,
    state: customer.state,
    country: customer.country,
    postalCode: customer.postalCode,
  });
};


/* =========================================================
   CREATE QUOTATION
========================================================= */

const createQuotation = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const company = await getCompany(req);
    const companyId = company._id;

    const {
      customerId,
      branchId,
      referenceNumber,
      quotationDate,
      validUntil,
      status,
      items,
      shippingAmount,
      otherCharges,
      adjustmentAmount,
      currency,
      billingAddress,
      shippingAddress,
      notes,
      termsAndConditions,
      customerNotes,
    } = req.body;

    const customer = await validateCustomer(
      customerId,
      workspaceId
    );

    await validateBranch(
      branchId,
      companyId
    );

    const productMap = await validateProducts(
      items,
      companyId
    );

    const preparedItems = prepareItems(
      items,
      productMap
    );

    const totals = calculateTotals(
      preparedItems,
      shippingAmount,
      otherCharges,
      adjustmentAmount
    );

    const quotationNumber =
      await generateQuotationNumber(companyId);

    const quotation = await Quotation.create({
      companyId,

      branchId:
        branchId || null,

      customerId,

      quotationNumber,

      referenceNumber:
        referenceNumber || '',

      quotationDate:
        quotationDate
          ? new Date(quotationDate)
          : new Date(),

      validUntil:
        validUntil
          ? new Date(validUntil)
          : null,

      status:
        status || 'draft',

      items: preparedItems,

      ...totals,

      currency:
        currency ||
        company.currency ||
        'INR',

      billingAddress:
        billingAddress
          ? sanitizeAddress(billingAddress)
          : getCustomerAddress(customer),

      shippingAddress:
        shippingAddress
          ? sanitizeAddress(shippingAddress)
          : getCustomerAddress(customer),

      notes:
        notes || '',

      termsAndConditions:
        termsAndConditions || '',

      customerNotes:
        customerNotes || '',

      createdBy:
        req.userId || null,

      updatedBy:
        req.userId || null,
    });

    const populatedQuotation =
      await Quotation.findOne({
        _id: quotation._id,
        companyId,
      })
        .populate(
          'customerId',
          'name displayName email phone mobile customerCode'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'items.productId',
          'name displayName productCode sku unit'
        );

    return res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: populatedQuotation,
    });
  } catch (error) {
    console.error(
      'Create quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create quotation',
    });
  }
};


/* =========================================================
   GET ALL QUOTATIONS
========================================================= */

const getQuotations = async (req, res) => {
  try {
    const companyId = await getCompanyId(req);

    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      customerId,
      branchId,
      dateFrom,
      dateTo,
      includeDeleted = 'false',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(
      1,
      parseInt(page, 10) || 1
    );

    const limitNumber = Math.min(
      100,
      Math.max(
        1,
        parseInt(limit, 10) || 10
      )
    );

    const filter = {
      companyId,
    };

    if (includeDeleted !== 'true') {
      filter.deletedAt = null;
    }

    if (status) {
      filter.status = status;
    }

    if (
      customerId &&
      isValidObjectId(customerId)
    ) {
      filter.customerId = customerId;
    }

    if (
      branchId &&
      isValidObjectId(branchId)
    ) {
      filter.branchId = branchId;
    }

    if (dateFrom || dateTo) {
      filter.quotationDate = {};

      if (dateFrom) {
        const from = new Date(dateFrom);

        if (!Number.isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0);
          filter.quotationDate.$gte = from;
        }
      }

      if (dateTo) {
        const to = new Date(dateTo);

        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          filter.quotationDate.$lte = to;
        }
      }
    }

    if (search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );

      const customers = await Customer.find({
        companyId:
          await getWorkspaceId(req),
        $or: [
          { name: regex },
          { displayName: regex },
          { email: regex },
          { phone: regex },
          { mobile: regex },
          { customerCode: regex },
        ],
      })
        .select('_id')
        .lean();

      const customerIds =
        customers.map(
          (customer) => customer._id
        );

      filter.$or = [
        { quotationNumber: regex },
        { referenceNumber: regex },
        {
          customerId: {
            $in: customerIds,
          },
        },
      ];
    }

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'quotationDate',
      'validUntil',
      'quotationNumber',
      'grandTotal',
      'status',
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';

    const safeSortOrder =
      sortOrder === 'asc' ? 1 : -1;

    const skip =
      (pageNumber - 1) * limitNumber;

    const [quotations, total] =
      await Promise.all([
        Quotation.find(filter)
          .populate(
            'customerId',
            'name displayName email phone mobile customerCode'
          )
          .populate(
            'branchId',
            'name code'
          )
          .sort({
            [safeSortBy]:
              safeSortOrder,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Quotation.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      data: quotations,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      'Get quotations error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch quotations',
    });
  }
};


/* =========================================================
   GET QUOTATION BY ID
========================================================= */

const getQuotationById = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findOne({
        _id: id,
        companyId,
      })
        .populate(
          'customerId',
          'name displayName email phone mobile customerCode address addressLine1 addressLine2 city state country postalCode'
        )
        .populate(
          'branchId',
          'name code address'
        )
        .populate(
          'items.productId',
          'name displayName productCode sku unit sellingPrice gstRate'
        )
        .populate(
          'createdBy',
          'name email'
        )
        .populate(
          'updatedBy',
          'name email'
        );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    return res.json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Get quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch quotation',
    });
  }
};


/* =========================================================
   UPDATE QUOTATION
========================================================= */

const updateQuotation = async (req, res) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const company =
      await getCompany(req);

    const companyId =
      company._id;

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (
      ['accepted', 'rejected', 'cancelled'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Quotation cannot be edited after it is ${quotation.status}`,
      });
    }

    const body = req.body;

    if (body.customerId) {
      await validateCustomer(
        body.customerId,
        workspaceId
      );

      quotation.customerId =
        body.customerId;
    }

    if (
      body.branchId !== undefined
    ) {
      await validateBranch(
        body.branchId,
        companyId
      );

      quotation.branchId =
        body.branchId || null;
    }

    if (body.referenceNumber !== undefined) {
      quotation.referenceNumber =
        body.referenceNumber;
    }

    if (body.quotationDate !== undefined) {
      const date = new Date(
        body.quotationDate
      );

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid quotationDate',
        });
      }

      quotation.quotationDate = date;
    }

    if (body.validUntil !== undefined) {
      if (!body.validUntil) {
        quotation.validUntil = null;
      } else {
        const date = new Date(
          body.validUntil
        );

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid validUntil date',
          });
        }

        quotation.validUntil = date;
      }
    }

    if (body.items !== undefined) {
      const productMap =
        await validateProducts(
          body.items,
          companyId
        );

      quotation.items =
        prepareItems(
          body.items,
          productMap
        );
    }

    if (
      body.shippingAmount !== undefined ||
      body.otherCharges !== undefined ||
      body.adjustmentAmount !== undefined ||
      body.items !== undefined
    ) {
      const totals =
        calculateTotals(
          quotation.items,
          body.shippingAmount !== undefined
            ? body.shippingAmount
            : quotation.shippingAmount,
          body.otherCharges !== undefined
            ? body.otherCharges
            : quotation.otherCharges,
          body.adjustmentAmount !== undefined
            ? body.adjustmentAmount
            : quotation.adjustmentAmount
        );

      quotation.subtotal =
        totals.subtotal;

      quotation.discountAmount =
        totals.discountAmount;

      quotation.taxableAmount =
        totals.taxableAmount;

      quotation.taxAmount =
        totals.taxAmount;

      quotation.shippingAmount =
        totals.shippingAmount;

      quotation.otherCharges =
        totals.otherCharges;

      quotation.adjustmentAmount =
        totals.adjustmentAmount;

      quotation.grandTotal =
        totals.grandTotal;
    }

    if (body.currency !== undefined) {
      quotation.currency =
        body.currency;
    }

    if (
      body.billingAddress !== undefined
    ) {
      quotation.billingAddress =
        sanitizeAddress(
          body.billingAddress
        );
    }

    if (
      body.shippingAddress !== undefined
    ) {
      quotation.shippingAddress =
        sanitizeAddress(
          body.shippingAddress
        );
    }

    if (body.notes !== undefined) {
      quotation.notes =
        body.notes;
    }

    if (
      body.termsAndConditions !== undefined
    ) {
      quotation.termsAndConditions =
        body.termsAndConditions;
    }

    if (
      body.customerNotes !== undefined
    ) {
      quotation.customerNotes =
        body.customerNotes;
    }

    if (body.status !== undefined) {
      const allowedStatuses = [
        'draft',
        'sent',
        'accepted',
        'rejected',
        'expired',
        'cancelled',
      ];

      if (
        !allowedStatuses.includes(
          body.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid quotation status',
        });
      }

      quotation.status =
        body.status;
    }

    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    const updatedQuotation =
      await Quotation.findById(
        quotation._id
      )
        .populate(
          'customerId',
          'name displayName email phone mobile customerCode'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'items.productId',
          'name displayName productCode sku unit'
        );

    return res.json({
      success: true,
      message:
        'Quotation updated successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    console.error(
      'Update quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to update quotation',
    });
  }
};


/* =========================================================
   SEND QUOTATION
========================================================= */

const sendQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (
      ['accepted', 'rejected', 'cancelled'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quotation cannot be sent in its current status',
      });
    }

    if (
      quotation.validUntil &&
      new Date() > quotation.validUntil
    ) {
      quotation.status = 'expired';
      quotation.expiredAt = new Date();

      await quotation.save();

      return res.status(400).json({
        success: false,
        message:
          'Quotation has already expired',
      });
    }

    quotation.status = 'sent';
    quotation.sentAt = new Date();
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation marked as sent',
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Send quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to send quotation',
    });
  }
};


/* =========================================================
   ACCEPT QUOTATION
========================================================= */

const acceptQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (
      quotation.status === 'cancelled' ||
      quotation.status === 'rejected'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Cancelled or rejected quotation cannot be accepted',
      });
    }

    if (
      quotation.validUntil &&
      new Date() > quotation.validUntil
    ) {
      quotation.status = 'expired';
      quotation.expiredAt = new Date();

      await quotation.save();

      return res.status(400).json({
        success: false,
        message:
          'Quotation has expired',
      });
    }

    quotation.status = 'accepted';
    quotation.acceptedAt = new Date();
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation accepted successfully',
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Accept quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to accept quotation',
    });
  }
};


/* =========================================================
   REJECT QUOTATION
========================================================= */

const rejectQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (
      ['cancelled', 'accepted'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Quotation cannot be rejected after it is ${quotation.status}`,
      });
    }

    quotation.status = 'rejected';
    quotation.rejectedAt = new Date();
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation rejected successfully',
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Reject quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to reject quotation',
    });
  }
};


/* =========================================================
   EXPIRE QUOTATION
========================================================= */

const expireQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (
      ['accepted', 'rejected', 'cancelled'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quotation cannot be expired in its current status',
      });
    }

    quotation.status = 'expired';
    quotation.expiredAt = new Date();
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation marked as expired',
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Expire quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to expire quotation',
    });
  }
};


/* =========================================================
   CANCEL QUOTATION
========================================================= */

const cancelQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (
      ['accepted', 'rejected'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Accepted or rejected quotation cannot be cancelled',
      });
    }

    quotation.status = 'cancelled';
    quotation.cancelledAt = new Date();
    quotation.cancelledBy =
      req.userId || null;
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation cancelled successfully',
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Cancel quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to cancel quotation',
    });
  }
};


/* =========================================================
   DELETE QUOTATION - SOFT DELETE
========================================================= */

const deleteQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    quotation.deletedAt = new Date();
    quotation.deletedBy =
      req.userId || null;
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation deleted successfully',
    });
  } catch (error) {
    console.error(
      'Delete quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to delete quotation',
    });
  }
};


/* =========================================================
   RESTORE QUOTATION
========================================================= */

const restoreQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (!quotation.deletedAt) {
      return res.status(400).json({
        success: false,
        message:
          'Quotation is not deleted',
      });
    }

    quotation.deletedAt = null;
    quotation.deletedBy = null;
    quotation.updatedBy =
      req.userId || null;

    await quotation.save();

    return res.json({
      success: true,
      message:
        'Quotation restored successfully',
      data: quotation,
    });
  } catch (error) {
    console.error(
      'Restore quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to restore quotation',
    });
  }
};


/* =========================================================
   DUPLICATE QUOTATION
========================================================= */

const duplicateQuotation = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const quotation =
      await Quotation.findOne({
        _id: req.params.id,
        companyId,
        deletedAt: null,
      }).lean();

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    const quotationNumber =
      await generateQuotationNumber(
        companyId
      );

    const duplicatedQuotation =
      await Quotation.create({
        ...quotation,

        _id: undefined,

        quotationNumber,

        referenceNumber:
          quotation.referenceNumber
            ? `COPY-${quotation.referenceNumber}`
            : '',

        quotationDate: new Date(),

        validUntil: null,

        status: 'draft',

        sentAt: null,
        acceptedAt: null,
        rejectedAt: null,
        expiredAt: null,
        cancelledAt: null,
        cancelledBy: null,

        convertedToSalesOrder: false,
        salesOrderId: null,

        deletedAt: null,
        deletedBy: null,

        createdBy:
          req.userId || null,

        updatedBy:
          req.userId || null,

        createdAt: undefined,
        updatedAt: undefined,
      });

    return res.status(201).json({
      success: true,
      message:
        'Quotation duplicated successfully',
      data: duplicatedQuotation,
    });
  } catch (error) {
    console.error(
      'Duplicate quotation error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to duplicate quotation',
    });
  }
};


/* =========================================================
   SUMMARY
========================================================= */

const getQuotationsSummary = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const baseFilter = {
      companyId,
      deletedAt: null,
    };

    const [
      total,
      draft,
      sent,
      accepted,
      rejected,
      expired,
      cancelled,
      totals,
    ] = await Promise.all([
      Quotation.countDocuments(
        baseFilter
      ),

      Quotation.countDocuments({
        ...baseFilter,
        status: 'draft',
      }),

      Quotation.countDocuments({
        ...baseFilter,
        status: 'sent',
      }),

      Quotation.countDocuments({
        ...baseFilter,
        status: 'accepted',
      }),

      Quotation.countDocuments({
        ...baseFilter,
        status: 'rejected',
      }),

      Quotation.countDocuments({
        ...baseFilter,
        status: 'expired',
      }),

      Quotation.countDocuments({
        ...baseFilter,
        status: 'cancelled',
      }),

      Quotation.aggregate([
        {
          $match: baseFilter,
        },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: '$grandTotal',
            },
            averageValue: {
              $avg: '$grandTotal',
            },
          },
        },
      ]),
    ]);

    const summary = totals[0] || {
      totalValue: 0,
      averageValue: 0,
    };

    return res.json({
      success: true,
      data: {
        total,
        draft,
        sent,
        accepted,
        rejected,
        expired,
        cancelled,
        totalValue:
          roundNumber(
            summary.totalValue
          ),
        averageValue:
          roundNumber(
            summary.averageValue
          ),
      },
    });
  } catch (error) {
    console.error(
      'Quotation summary error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch quotation summary',
    });
  }
};


/* =========================================================
   AUTO EXPIRE OLD QUOTATIONS
========================================================= */

const expireOldQuotations = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const now = new Date();

    const result =
      await Quotation.updateMany(
        {
          companyId,
          deletedAt: null,
          status: {
            $in: ['draft', 'sent'],
          },
          validUntil: {
            $lt: now,
            $ne: null,
          },
        },
        {
          $set: {
            status: 'expired',
            expiredAt: now,
            updatedBy:
              req.userId || null,
          },
        }
      );

    return res.json({
      success: true,
      message:
        'Expired quotations updated successfully',
      data: {
        modifiedCount:
          result.modifiedCount || 0,
      },
    });
  } catch (error) {
    console.error(
      'Expire old quotations error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to expire old quotations',
    });
  }
};


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  expireQuotation,
  cancelQuotation,
  deleteQuotation,
  restoreQuotation,
  duplicateQuotation,
  getQuotationsSummary,
  expireOldQuotations,
};