const mongoose = require('mongoose');

const Purchase = require('../models/purchase.model');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const Company = require('../models/Company');

/**
 * Resolve the actual Company._id from the authenticated workspace.
 *
 * req.companyId = workspaceId from JWT
 * Purchase.companyId = actual Company._id
 *
 * This keeps Purchase consistent with the Vendor and Branch modules.
 */
const getPurchaseCompanyId = async (req) => {
  if (!req.companyId) {
    const error = new Error('Company context is missing');
    error.statusCode = 401;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(req.companyId)) {
    const error = new Error('Invalid company context');
    error.statusCode = 403;
    throw error;
  }

  const company = await Company.findOne({
    workspaceId: req.companyId,
    status: 'active',
  })
    .select('_id workspaceId status')
    .lean();

  if (!company) {
    const error = new Error(
      'No company found for this workspace'
    );
    error.statusCode = 404;
    throw error;
  }

  return company._id.toString();
};

/**
 * Generate next purchase number for the company.
 */
const generatePurchaseNumber = async (companyId) => {
  const prefix = 'PO';

  const lastPurchase = await Purchase.findOne({
    companyId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .select('purchaseNumber')
    .lean();

  let nextNumber = 1;

  if (lastPurchase?.purchaseNumber) {
    const match = lastPurchase.purchaseNumber.match(/(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
};

/**
 * Calculate individual purchase item amounts.
 */
const calculateItem = (item) => {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  const discountPercent = Number(item.discountPercent || 0);
  const gstRate = Number(item.gstRate || 0);

  const grossAmount = quantity * unitPrice;

  const discountAmount =
    grossAmount * (discountPercent / 100);

  const taxableAmount =
    grossAmount - discountAmount;

  const gstAmount =
    taxableAmount * (gstRate / 100);

  const totalAmount =
    taxableAmount + gstAmount;

  return {
    ...item,

    quantity,
    unitPrice,
    discountPercent,

    discountAmount: Number(
      discountAmount.toFixed(2)
    ),

    taxableAmount: Number(
      taxableAmount.toFixed(2)
    ),

    gstRate,

    gstAmount: Number(
      gstAmount.toFixed(2)
    ),

    totalAmount: Number(
      totalAmount.toFixed(2)
    ),
  };
};

/**
 * Calculate purchase totals.
 */
const calculateTotals = (
  items,
  shippingAmount = 0,
  otherCharges = 0,
  adjustmentAmount = 0
) => {
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity) *
        Number(item.unitPrice),
    0
  );

  const discountAmount = items.reduce(
    (sum, item) =>
      sum + Number(item.discountAmount || 0),
    0
  );

  const taxableAmount = items.reduce(
    (sum, item) =>
      sum + Number(item.taxableAmount || 0),
    0
  );

  const gstAmount = items.reduce(
    (sum, item) =>
      sum + Number(item.gstAmount || 0),
    0
  );

  const normalizedShipping =
    Number(shippingAmount || 0);

  const normalizedOtherCharges =
    Number(otherCharges || 0);

  const normalizedAdjustment =
    Number(adjustmentAmount || 0);

  const grandTotal =
    taxableAmount +
    gstAmount +
    normalizedShipping +
    normalizedOtherCharges +
    normalizedAdjustment;

  return {
    subtotal: Number(
      subtotal.toFixed(2)
    ),

    discountAmount: Number(
      discountAmount.toFixed(2)
    ),

    taxableAmount: Number(
      taxableAmount.toFixed(2)
    ),

    gstAmount: Number(
      gstAmount.toFixed(2)
    ),

    shippingAmount: Number(
      normalizedShipping.toFixed(2)
    ),

    otherCharges: Number(
      normalizedOtherCharges.toFixed(2)
    ),

    adjustmentAmount: Number(
      normalizedAdjustment.toFixed(2)
    ),

    grandTotal: Number(
      Math.max(0, grandTotal).toFixed(2)
    ),
  };
};

/**
 * Validate MongoDB ObjectId.
 */
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate purchase items and load products
 * belonging to the authenticated company.
 *
 * Product branchId is intentionally not checked.
 *
 * A company-level product with branchId = null
 * can be purchased for any valid branch of
 * the same company.
 */
const validateItems = async (
  companyId,
  items
) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return {
      valid: false,
      message:
        'At least one purchase item is required',
    };
  }

  for (const item of items) {
    if (!item.productId) {
      return {
        valid: false,
        message:
          'Each item must have a productId',
      };
    }

    if (!validateObjectId(item.productId)) {
      return {
        valid: false,
        message:
          `Invalid productId: ${item.productId}`,
      };
    }

    if (
      !Number.isFinite(
        Number(item.quantity)
      ) ||
      Number(item.quantity) <= 0
    ) {
      return {
        valid: false,
        message:
          'Each item quantity must be greater than 0',
      };
    }

    if (
      !Number.isFinite(
        Number(item.unitPrice)
      ) ||
      Number(item.unitPrice) < 0
    ) {
      return {
        valid: false,
        message:
          'Each item unitPrice must be 0 or greater',
      };
    }

    if (
      item.discountPercent !== undefined &&
      (
        !Number.isFinite(
          Number(item.discountPercent)
        ) ||
        Number(item.discountPercent) < 0 ||
        Number(item.discountPercent) > 100
      )
    ) {
      return {
        valid: false,
        message:
          'Discount percent must be between 0 and 100',
      };
    }

    if (
      item.gstRate !== undefined &&
      (
        !Number.isFinite(
          Number(item.gstRate)
        ) ||
        Number(item.gstRate) < 0 ||
        Number(item.gstRate) > 100
      )
    ) {
      return {
        valid: false,
        message:
          'GST rate must be between 0 and 100',
      };
    }
  }

  const productIds = items.map(
    (item) => item.productId
  );

  const products = await Product.find({
    _id: {
      $in: productIds,
    },

    companyId,

    deletedAt: null,

    status: 'active',
  })
    .select(
      '_id productCode sku name displayName unit gstRate purchasePrice'
    )
    .lean();

  const productMap = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ])
  );

  for (const item of items) {
    if (
      !productMap.has(
        item.productId.toString()
      )
    ) {
      return {
        valid: false,
        message:
          `Product not found or inactive: ${item.productId}`,
      };
    }
  }

  return {
    valid: true,
    productMap,
  };
};

/**
 * Create Purchase.
 */
const createPurchase = async (
  req,
  res
) => {
  try {
    /**
     * IMPORTANT:
     * getPurchaseCompanyId is async.
     * await is required.
     */
    const companyId =
      await getPurchaseCompanyId(req);

    console.log(
      '=== PURCHASE TENANT DEBUG ==='
    );

    console.log(
      'req.companyId:',
      req.companyId
    );

    console.log(
      'resolved companyId:',
      companyId
    );

    console.log(
      'vendorId:',
      req.body.vendorId
    );

    console.log(
      'branchId:',
      req.body.branchId
    );

    console.log(
      '============================='
    );

    const {
      vendorId,
      branchId,
      purchaseDate,
      expectedDeliveryDate,
      referenceNumber,
      items,
      shippingAmount,
      otherCharges,
      adjustmentAmount,
      notes,
      termsAndConditions,
      status,
      paymentStatus,
    } = req.body;

    /**
     * Validate vendor.
     */
    if (
      !vendorId ||
      !validateObjectId(vendorId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Valid vendorId is required',
      });
    }

    const vendor =
      await Vendor.findOne({
        _id: vendorId,
        companyId,
        deletedAt: null,
        status: 'active',
      }).lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          'Vendor not found or inactive',
      });
    }

    /**
     * Validate branch.
     */
    if (branchId) {
      if (!validateObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branchId',
        });
      }

      const branch =
        await Branch.findOne({
          _id: branchId,
          companyId,
          status: 'active',
        }).lean();

      if (!branch) {
        return res.status(404).json({
          success: false,
          message:
            'Branch not found or inactive',
        });
      }
    }

    /**
     * Validate products.
     */
    const itemValidation =
      await validateItems(
        companyId,
        items
      );

    if (!itemValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          itemValidation.message,
      });
    }

    /**
     * Process purchase items.
     */
    const processedItems =
      items.map((item) => {
        const product =
          itemValidation.productMap.get(
            item.productId.toString()
          );

        return calculateItem({
          productId: product._id,

          productCode:
            product.productCode,

          productName:
            product.name,

          description:
            item.description || '',

          quantity:
            item.quantity,

          unit:
            item.unit ||
            product.unit ||
            'PCS',

          unitPrice:
            item.unitPrice !== undefined
              ? item.unitPrice
              : product.purchasePrice || 0,

          discountPercent:
            item.discountPercent || 0,

          gstRate:
            item.gstRate !== undefined
              ? item.gstRate
              : product.gstRate || 0,
        });
      });

    /**
     * Calculate totals.
     */
    const totals =
      calculateTotals(
        processedItems,
        shippingAmount,
        otherCharges,
        adjustmentAmount
      );

    /**
     * Generate purchase number.
     */
    const purchaseNumber =
      await generatePurchaseNumber(
        companyId
      );

    /**
     * Create purchase.
     */
    const purchase =
      await Purchase.create({
        companyId,

        branchId:
          branchId || null,

        vendorId,

        purchaseNumber,

        purchaseDate:
          purchaseDate || new Date(),

        expectedDeliveryDate:
          expectedDeliveryDate || null,

        referenceNumber:
          referenceNumber || '',

        items:
          processedItems,

        ...totals,

        notes:
          notes || '',

        termsAndConditions:
          termsAndConditions || '',

        status:
          status || 'draft',

        paymentStatus:
          paymentStatus || 'unpaid',

        createdBy:
          req.userId || null,

        updatedBy:
          req.userId || null,
      });

    /**
     * Populate response.
     */
    const populatedPurchase =
      await Purchase.findById(
        purchase._id
      )
        .populate(
          'vendorId',
          'vendorCode name displayName email phone gstNumber'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'items.productId',
          'productCode sku name displayName unit gstRate purchasePrice'
        );

    return res.status(201).json({
      success: true,
      message:
        'Purchase order created successfully',
      data:
        populatedPurchase,
    });
  } catch (error) {
    console.error(
      'Create purchase error:',
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Purchase number already exists. Please try again.',
      });
    }

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to create purchase order',
    });
  }
};

/**
 * Get Purchases.
 */
const getPurchases = async (
  req,
  res
) => {
  try {
    /**
     * IMPORTANT:
     * await is required because
     * getPurchaseCompanyId is async.
     */
    const companyId =
      await getPurchaseCompanyId(req);

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

    const {
      search,
      vendorId,
      branchId,
      status,
      paymentStatus,
      startDate,
      endDate,
    } = req.query;

    const filter = {
      companyId,
      deletedAt: null,
    };

    /**
     * Vendor filter.
     */
    if (vendorId) {
      if (!validateObjectId(vendorId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendorId',
        });
      }

      filter.vendorId =
        vendorId;
    }

    /**
     * Branch filter.
     */
    if (branchId) {
      if (!validateObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branchId',
        });
      }

      filter.branchId =
        branchId;
    }

    /**
     * Status filter.
     */
    if (status) {
      filter.status =
        status;
    }

    /**
     * Payment status filter.
     */
    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
    }

    /**
     * Date filters.
     */
    if (startDate || endDate) {
      filter.purchaseDate = {};

      if (startDate) {
        const start =
          new Date(startDate);

        if (
          Number.isNaN(
            start.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid startDate',
          });
        }

        filter.purchaseDate.$gte =
          start;
      }

      if (endDate) {
        const end =
          new Date(endDate);

        if (
          Number.isNaN(
            end.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid endDate',
          });
        }

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.purchaseDate.$lte =
          end;
      }
    }

    /**
     * Search purchase number,
     * reference number or vendor.
     */
    if (search?.trim()) {
      const searchRegex =
        new RegExp(
          search.trim(),
          'i'
        );

      const vendors =
        await Vendor.find({
          companyId,
          deletedAt: null,

          $or: [
            {
              name: searchRegex,
            },
            {
              vendorCode:
                searchRegex,
            },
          ],
        })
          .select('_id')
          .lean();

      filter.$or = [
        {
          purchaseNumber:
            searchRegex,
        },
        {
          referenceNumber:
            searchRegex,
        },
        {
          vendorId: {
            $in:
              vendors.map(
                (vendor) =>
                  vendor._id
              ),
          },
        },
      ];
    }

    const [
      purchases,
      total,
    ] = await Promise.all([
      Purchase.find(filter)
        .populate(
          'vendorId',
          'vendorCode name displayName email phone'
        )
        .populate(
          'branchId',
          'name code'
        )
        .select('-items')
        .sort({
          purchaseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Purchase.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,

      data:
        purchases,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),

        pages:
          Math.ceil(
            total / limit
          ),

        hasNextPage:
          page <
          Math.ceil(
            total / limit
          ),

        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      'Get purchases error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch purchases',
    });
  }
};

/**
 * Get Purchase by ID.
 */
const getPurchaseById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid purchase ID',
      });
    }

    /**
     * IMPORTANT:
     * await is required.
     */
    const companyId =
      await getPurchaseCompanyId(req);

    const purchase =
      await Purchase.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      })
        .populate(
          'vendorId',
          'vendorCode name displayName email phone alternatePhone gstNumber panNumber paymentTerms billingAddress shippingAddress contactPerson'
        )
        .populate(
          'branchId',
          'name code email phone address'
        )
        .populate(
          'items.productId',
          'productCode sku name displayName unit gstRate purchasePrice'
        )
        .populate(
          'createdBy',
          'name email'
        )
        .populate(
          'updatedBy',
          'name email'
        );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          'Purchase order not found',
      });
    }

    return res.json({
      success: true,
      data:
        purchase,
    });
  } catch (error) {
    console.error(
      'Get purchase error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch purchase order',
    });
  }
};

/**
 * Update Purchase.
 */
const updatePurchase = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid purchase ID',
      });
    }

    /**
     * IMPORTANT:
     * await is required.
     */
    const companyId =
      await getPurchaseCompanyId(req);

    const purchase =
      await Purchase.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          'Purchase order not found',
      });
    }

    if (
      [
        'received',
        'cancelled',
      ].includes(
        purchase.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Purchase order cannot be edited when status is ${purchase.status}`,
      });
    }

    const {
      vendorId,
      branchId,
      purchaseDate,
      expectedDeliveryDate,
      referenceNumber,
      items,
      shippingAmount,
      otherCharges,
      adjustmentAmount,
      notes,
      termsAndConditions,
      status,
      paymentStatus,
    } = req.body;

    /**
     * Validate vendor if supplied.
     */
    if (vendorId !== undefined) {
      if (
        !vendorId ||
        !validateObjectId(vendorId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Valid vendorId is required',
        });
      }

      const vendor =
        await Vendor.findOne({
          _id: vendorId,
          companyId,
          deletedAt: null,
          status: 'active',
        }).lean();

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message:
            'Vendor not found or inactive',
        });
      }

      purchase.vendorId =
        vendorId;
    }

    /**
     * Validate branch if supplied.
     */
    if (branchId !== undefined) {
      if (branchId) {
        if (
          !validateObjectId(
            branchId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid branchId',
          });
        }

        const branch =
          await Branch.findOne({
            _id: branchId,
            companyId,
            status: 'active',
          }).lean();

        if (!branch) {
          return res.status(404).json({
            success: false,
            message:
              'Branch not found or inactive',
          });
        }
      }

      purchase.branchId =
        branchId || null;
    }

    /**
     * Validate and process items.
     */
    if (items !== undefined) {
      const itemValidation =
        await validateItems(
          companyId,
          items
        );

      if (!itemValidation.valid) {
        return res.status(400).json({
          success: false,
          message:
            itemValidation.message,
        });
      }

      purchase.items =
        items.map((item) => {
          const product =
            itemValidation.productMap.get(
              item.productId.toString()
            );

          return calculateItem({
            productId:
              product._id,

            productCode:
              product.productCode,

            productName:
              product.name,

            description:
              item.description || '',

            quantity:
              item.quantity,

            unit:
              item.unit ||
              product.unit ||
              'PCS',

            unitPrice:
              item.unitPrice !==
              undefined
                ? item.unitPrice
                : product.purchasePrice ||
                  0,

            discountPercent:
              item.discountPercent ||
              0,

            gstRate:
              item.gstRate !==
              undefined
                ? item.gstRate
                : product.gstRate ||
                  0,
          });
        });
    }

    /**
     * Basic fields.
     */
    if (
      purchaseDate !== undefined
    ) {
      purchase.purchaseDate =
        purchaseDate;
    }

    if (
      expectedDeliveryDate !==
      undefined
    ) {
      purchase.expectedDeliveryDate =
        expectedDeliveryDate ||
        null;
    }

    if (
      referenceNumber !==
      undefined
    ) {
      purchase.referenceNumber =
        referenceNumber;
    }

    /**
     * Charges.
     */
    if (
      shippingAmount !==
      undefined
    ) {
      purchase.shippingAmount =
        Number(
          shippingAmount
        ) || 0;
    }

    if (
      otherCharges !==
      undefined
    ) {
      purchase.otherCharges =
        Number(
          otherCharges
        ) || 0;
    }

    if (
      adjustmentAmount !==
      undefined
    ) {
      purchase.adjustmentAmount =
        Number(
          adjustmentAmount
        ) || 0;
    }

    /**
     * Notes and terms.
     */
    if (
      notes !== undefined
    ) {
      purchase.notes =
        notes;
    }

    if (
      termsAndConditions !==
      undefined
    ) {
      purchase.termsAndConditions =
        termsAndConditions;
    }

    /**
     * Purchase status.
     */
    if (
      status !== undefined
    ) {
      const allowedStatuses = [
        'draft',
        'pending',
        'approved',
        'confirmed',
        'received',
        'cancelled',
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid purchase status',
        });
      }

      purchase.status =
        status;
    }

    /**
     * Payment status.
     */
    if (
      paymentStatus !==
      undefined
    ) {
      const allowedPaymentStatuses = [
        'unpaid',
        'partial',
        'partially_paid',
        'paid',
      ];

      if (
        !allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid payment status',
        });
      }

      purchase.paymentStatus =
        paymentStatus;
    }

    /**
     * Recalculate totals.
     */
    const totals =
      calculateTotals(
        purchase.items,
        purchase.shippingAmount,
        purchase.otherCharges,
        purchase.adjustmentAmount
      );

    Object.assign(
      purchase,
      totals
    );

    purchase.updatedBy =
      req.userId || null;

    await purchase.save();

    /**
     * Populate updated response.
     */
    const updatedPurchase =
      await Purchase.findById(
        purchase._id
      )
        .populate(
          'vendorId',
          'vendorCode name displayName email phone gstNumber'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'items.productId',
          'productCode sku name displayName unit gstRate purchasePrice'
        );

    return res.json({
      success: true,
      message:
        'Purchase order updated successfully',
      data:
        updatedPurchase,
    });
  } catch (error) {
    console.error(
      'Update purchase error:',
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Purchase number already exists. Please try again.',
      });
    }

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to update purchase order',
    });
  }
};

/**
 * Delete Purchase - soft delete.
 */
const deletePurchase = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid purchase ID',
      });
    }

    /**
     * IMPORTANT:
     * await is required.
     */
    const companyId =
      await getPurchaseCompanyId(req);

    const purchase =
      await Purchase.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          'Purchase order not found',
      });
    }

    if (
      purchase.status ===
      'received'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Received purchase orders cannot be deleted',
      });
    }

    purchase.deletedAt =
      new Date();

    purchase.deletedBy =
      req.userId || null;

    purchase.updatedBy =
      req.userId || null;

    await purchase.save();

    return res.json({
      success: true,
      message:
        'Purchase order deleted successfully',
    });
  } catch (error) {
    console.error(
      'Delete purchase error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to delete purchase order',
    });
  }
};

/**
 * Restore Purchase.
 */
const restorePurchase = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid purchase ID',
      });
    }

    /**
     * IMPORTANT:
     * await is required.
     */
    const companyId =
      await getPurchaseCompanyId(req);

    const purchase =
      await Purchase.findOne({
        _id: id,
        companyId,
        deletedAt: {
          $ne: null,
        },
      });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          'Deleted purchase order not found',
      });
    }

    purchase.deletedAt =
      null;

    purchase.deletedBy =
      null;

    purchase.updatedBy =
      req.userId || null;

    await purchase.save();

    return res.json({
      success: true,
      message:
        'Purchase order restored successfully',
      data:
        purchase,
    });
  } catch (error) {
    console.error(
      'Restore purchase error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to restore purchase order',
    });
  }
};

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  restorePurchase,
};