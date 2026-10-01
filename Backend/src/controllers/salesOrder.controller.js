const mongoose = require('mongoose');

const SalesOrder = require('../models/SalesOrder');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const Quotation = require('../models/Quotation');

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const roundNumber = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getWorkspaceId = (req) => {
  return req.companyId;
};

const getCompany = async (req) => {
  const workspaceId = getWorkspaceId(req);

  if (!workspaceId) {
    throw new Error('Workspace ID is missing');
  }

  let company = await Company.findOne({
    workspaceId,
    status: 'active',
  })
    .select('_id workspaceId status name legalName currency')
    .lean();

  if (!company && isValidObjectId(workspaceId)) {
    company = await Company.findOne({
      _id: workspaceId,
      status: 'active',
    })
      .select('_id workspaceId status name legalName currency')
      .lean();
  }

  if (!company) {
    throw new Error('Active company not found');
  }

  return company;
};

const getCompanyId = async (req) => {
  const company = await getCompany(req);
  return company._id;
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
    throw new Error('Branch not found for your company');
  }

  return branch;
};

const validateQuotation = async (
  quotationId,
  companyId
) => {
  if (!quotationId) {
    return null;
  }

  if (!isValidObjectId(quotationId)) {
    throw new Error('Invalid quotationId');
  }

  const quotation = await Quotation.findOne({
    _id: quotationId,
    companyId,
    deletedAt: null,
  }).lean();

  if (!quotation) {
    throw new Error('Quotation not found for your company');
  }

  return quotation;
};

const validateProducts = async (items, companyId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item is required');
  }

  const productIds = items.map((item) => item.productId);

  const invalidId = productIds.find(
    (id) => !isValidObjectId(id)
  );

  if (invalidId) {
    throw new Error('One or more productId values are invalid');
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

  for (const id of productIds) {
    if (!productMap.has(String(id))) {
      throw new Error(
        `Product ${id} not found in your company`
      );
    }
  }

  return productMap;
};

const prepareItems = (items, productMap) => {
  return items.map((item) => {
    const product = productMap.get(
      String(item.productId)
    );

    const quantity = normalizeNumber(item.quantity, 0);

    if (quantity <= 0) {
      throw new Error(
        `Quantity must be greater than 0 for ${product.name}`
      );
    }

    const unitPrice = normalizeNumber(
      item.unitPrice,
      normalizeNumber(
        product.sellingPrice,
        normalizeNumber(product.salePrice, 0)
      )
    );

    const discountPercent = Math.min(
      100,
      Math.max(
        0,
        normalizeNumber(item.discountPercent, 0)
      )
    );

    const taxPercent = Math.min(
      100,
      Math.max(
        0,
        normalizeNumber(
          item.taxPercent,
          normalizeNumber(product.gstRate, 0)
        )
      )
    );

    const grossAmount = roundNumber(
      quantity * unitPrice
    );

    const discountAmount = roundNumber(
      grossAmount * (discountPercent / 100)
    );

    const taxableAmount = roundNumber(
      grossAmount - discountAmount
    );

    const taxAmount = roundNumber(
      taxableAmount * (taxPercent / 100)
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
        product.name ||
        product.displayName ||
        'Product',
      description:
        item.description || '',
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

const calculateTotals = ({
  items,
  shippingAmount = 0,
  otherCharges = 0,
  adjustmentAmount = 0,
  paidAmount = 0,
}) => {
  const subtotal = roundNumber(
    items.reduce(
      (sum, item) =>
        sum +
        roundNumber(
          item.quantity * item.unitPrice
        ),
      0
    )
  );

  const discountAmount = roundNumber(
    items.reduce(
      (sum, item) =>
        sum + normalizeNumber(item.discountAmount),
      0
    )
  );

  const taxableAmount = roundNumber(
    items.reduce(
      (sum, item) =>
        sum + normalizeNumber(item.taxableAmount),
      0
    )
  );

  const taxAmount = roundNumber(
    items.reduce(
      (sum, item) =>
        sum + normalizeNumber(item.taxAmount),
      0
    )
  );

  const shipping = Math.max(
    0,
    normalizeNumber(shippingAmount)
  );

  const other = Math.max(
    0,
    normalizeNumber(otherCharges)
  );

  const adjustment = normalizeNumber(
    adjustmentAmount
  );

  const grandTotal = Math.max(
    0,
    roundNumber(
      taxableAmount +
        taxAmount +
        shipping +
        other +
        adjustment
    )
  );

  const paid = Math.min(
    grandTotal,
    Math.max(0, normalizeNumber(paidAmount))
  );

  const balanceAmount = roundNumber(
    Math.max(0, grandTotal - paid)
  );

  let paymentStatus = 'unpaid';

  if (paid > 0 && paid < grandTotal) {
    paymentStatus = 'partial';
  }

  if (paid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'paid';
  }

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    shippingAmount: shipping,
    otherCharges: other,
    adjustmentAmount: adjustment,
    grandTotal,
    paidAmount: paid,
    balanceAmount,
    paymentStatus,
  };
};

const sanitizeAddress = (address = {}) => ({
  line1: address.line1 || '',
  line2: address.line2 || '',
  city: address.city || '',
  state: address.state || '',
  country: address.country || '',
  postalCode: address.postalCode || '',
});

const getCustomerAddress = (customer) => {
  if (!customer) {
    return {};
  }

  return (
    customer.address ||
    customer.billingAddress ||
    {}
  );
};

const generateOrderNumber = async (companyId) => {
  const year = new Date()
    .getFullYear();

  const prefix = `SO-${year}-`;

  const latest = await SalesOrder.findOne({
    companyId,
    orderNumber: {
      $regex: `^${prefix}`,
    },
  })
    .sort({ orderNumber: -1 })
    .select('orderNumber')
    .lean();

  let nextNumber = 1;

  if (latest?.orderNumber) {
    const match =
      latest.orderNumber.match(
        /(\d+)$/
      );

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

const createSalesOrder = async (req, res) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const company =
      await getCompany(req);

    const companyId =
      company._id;

    const {
      customerId,
      branchId,
      quotationId,
      referenceNumber,
      orderDate,
      expectedDeliveryDate,
      items,
      shippingAmount,
      otherCharges,
      adjustmentAmount,
      paidAmount,
      paymentMethod,
      currency,
      billingAddress,
      shippingAddress,
      notes,
      termsAndConditions,
      customerNotes,
    } = req.body;

    const customer =
      await validateCustomer(
        customerId,
        workspaceId
      );

    await validateBranch(
      branchId,
      companyId
    );

    const quotation =
      await validateQuotation(
        quotationId,
        companyId
      );

    if (
      quotation &&
      String(quotation.customerId) !==
        String(customerId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quotation customer does not match the selected customer',
      });
    }

    const productMap =
      await validateProducts(
        items,
        companyId
      );

    const preparedItems =
      prepareItems(
        items,
        productMap
      );

    const totals =
      calculateTotals({
        items: preparedItems,
        shippingAmount,
        otherCharges,
        adjustmentAmount,
        paidAmount,
      });

    const orderNumber =
      await generateOrderNumber(
        companyId
      );

    const salesOrder =
      await SalesOrder.create({
        companyId,
        branchId: branchId || null,
        customerId,
        quotationId:
          quotationId || null,

        orderNumber,

        referenceNumber:
          referenceNumber || '',

        orderDate:
          orderDate || new Date(),

        expectedDeliveryDate:
          expectedDeliveryDate || null,

        status: 'draft',

        paymentStatus:
          totals.paymentStatus,

        paymentMethod:
          paymentMethod || '',

        items: preparedItems,

        ...totals,

        currency:
          currency ||
          company.currency ||
          'INR',

        billingAddress:
          sanitizeAddress(
            billingAddress ||
              getCustomerAddress(
                customer
              )
          ),

        shippingAddress:
          sanitizeAddress(
            shippingAddress ||
              billingAddress ||
              getCustomerAddress(
                customer
              )
          ),

        notes: notes || '',

        termsAndConditions:
          termsAndConditions || '',

        customerNotes:
          customerNotes || '',

        createdBy:
          req.userId || null,

        updatedBy:
          req.userId || null,
      });

    const populated =
      await SalesOrder.findById(
        salesOrder._id
      )
        .populate(
          'customerId',
          'name email phone companyName'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'quotationId',
          'quotationNumber status'
        )
        .lean();

    return res.status(201).json({
      success: true,
      message:
        'Sales order created successfully',
      data: populated,
    });
  } catch (error) {
    console.error(
      'createSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getSalesOrders = async (req, res) => {
  try {
    const companyId =
      await getCompanyId(req);

    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      paymentStatus,
      customerId,
      branchId,
      quotationId,
      startDate,
      endDate,
      includeDeleted = 'false',
    } = req.query;

    const pageNumber = Math.max(
      1,
      Number(page)
    );

    const limitNumber = Math.min(
      100,
      Math.max(1, Number(limit))
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

    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
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

    if (
      quotationId &&
      isValidObjectId(quotationId)
    ) {
      filter.quotationId =
        quotationId;
    }

    if (startDate || endDate) {
      filter.orderDate = {};

      if (startDate) {
        filter.orderDate.$gte =
          new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.orderDate.$lte = end;
      }
    }

    if (search.trim()) {
      const regex =
        new RegExp(
          search.trim(),
          'i'
        );

      filter.$or = [
        {
          orderNumber: regex,
        },
        {
          referenceNumber: regex,
        },
      ];
    }

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      salesOrders,
      total,
    ] = await Promise.all([
      SalesOrder.find(filter)
        .populate(
          'customerId',
          'name email phone companyName'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'quotationId',
          'quotationNumber status'
        )
        .sort({
          orderDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      SalesOrder.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,
      data: salesOrders,
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
      'getSalesOrders:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getSalesOrderById = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID',
      });
    }

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
      })
        .populate(
          'customerId'
        )
        .populate(
          'branchId'
        )
        .populate(
          'quotationId'
        )
        .lean();

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    return res.json({
      success: true,
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'getSalesOrderById:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID',
      });
    }

    const existing =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (
      [
        'delivered',
        'cancelled',
        'closed',
      ].includes(existing.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot update a ${existing.status} sales order`,
      });
    }

    const body = req.body;

    let customer = null;

    if (body.customerId) {
      customer =
        await validateCustomer(
          body.customerId,
          getWorkspaceId(req)
        );
    }

    const finalCustomerId =
      body.customerId ||
      existing.customerId;

    if (!customer) {
      customer =
        await validateCustomer(
          finalCustomerId,
          getWorkspaceId(req)
        );
    }

    if (
      body.branchId !== undefined
    ) {
      await validateBranch(
        body.branchId,
        companyId
      );
    }

    if (
      body.quotationId !== undefined &&
      body.quotationId !== null
    ) {
      const quotation =
        await validateQuotation(
          body.quotationId,
          companyId
        );

      if (
        quotation &&
        String(
          quotation.customerId
        ) !== String(finalCustomerId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Quotation customer does not match the selected customer',
        });
      }
    }

    let preparedItems =
      existing.items;

    if (
      Array.isArray(body.items)
    ) {
      const productMap =
        await validateProducts(
          body.items,
          companyId
        );

      preparedItems =
        prepareItems(
          body.items,
          productMap
        );
    }

    const totals =
      calculateTotals({
        items: preparedItems,
        shippingAmount:
          body.shippingAmount !==
          undefined
            ? body.shippingAmount
            : existing.shippingAmount,

        otherCharges:
          body.otherCharges !==
          undefined
            ? body.otherCharges
            : existing.otherCharges,

        adjustmentAmount:
          body.adjustmentAmount !==
          undefined
            ? body.adjustmentAmount
            : existing.adjustmentAmount,

        paidAmount:
          body.paidAmount !==
          undefined
            ? body.paidAmount
            : existing.paidAmount,
      });

    existing.customerId =
      finalCustomerId;

    if (
      body.branchId !== undefined
    ) {
      existing.branchId =
        body.branchId || null;
    }

    if (
      body.quotationId !== undefined
    ) {
      existing.quotationId =
        body.quotationId || null;
    }

    if (
      body.referenceNumber !==
      undefined
    ) {
      existing.referenceNumber =
        body.referenceNumber;
    }

    if (
      body.orderDate !== undefined
    ) {
      existing.orderDate =
        body.orderDate;
    }

    if (
      body.expectedDeliveryDate !==
      undefined
    ) {
      existing.expectedDeliveryDate =
        body.expectedDeliveryDate ||
        null;
    }

    if (
      body.paymentMethod !==
      undefined
    ) {
      existing.paymentMethod =
        body.paymentMethod;
    }

    if (
      body.currency !== undefined
    ) {
      existing.currency =
        body.currency;
    }

    if (
      body.billingAddress !==
      undefined
    ) {
      existing.billingAddress =
        sanitizeAddress(
          body.billingAddress
        );
    }

    if (
      body.shippingAddress !==
      undefined
    ) {
      existing.shippingAddress =
        sanitizeAddress(
          body.shippingAddress
        );
    }

    if (
      body.notes !== undefined
    ) {
      existing.notes =
        body.notes;
    }

    if (
      body.termsAndConditions !==
      undefined
    ) {
      existing.termsAndConditions =
        body.termsAndConditions;
    }

    if (
      body.customerNotes !==
      undefined
    ) {
      existing.customerNotes =
        body.customerNotes;
    }

    existing.items =
      preparedItems;

    Object.assign(
      existing,
      totals
    );

    existing.updatedBy =
      req.userId || null;

    await existing.save();

    const updated =
      await SalesOrder.findById(
        existing._id
      )
        .populate(
          'customerId',
          'name email phone companyName'
        )
        .populate(
          'branchId',
          'name code'
        )
        .populate(
          'quotationId',
          'quotationNumber status'
        )
        .lean();

    return res.json({
      success: true,
      message:
        'Sales order updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error(
      'updateSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const confirmSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (
      salesOrder.status !==
      'draft'
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Only draft orders can be confirmed. Current status: ${salesOrder.status}`,
      });
    }

    salesOrder.status =
      'confirmed';

    salesOrder.confirmedAt =
      new Date();

    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order confirmed successfully',
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'confirmSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const processSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (
      ![
        'confirmed',
        'partially_delivered',
      ].includes(
        salesOrder.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Only confirmed orders can be moved to processing',
      });
    }

    salesOrder.status =
      'processing';

    salesOrder.processingAt =
      new Date();

    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order moved to processing',
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'processSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const markSalesOrderDelivered = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (
      ![
        'confirmed',
        'processing',
        'partially_delivered',
      ].includes(
        salesOrder.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This order cannot be marked as delivered',
      });
    }

    salesOrder.status =
      'delivered';

    salesOrder.deliveredAt =
      new Date();

    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order marked as delivered',
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'markSalesOrderDelivered:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const cancelSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (
      [
        'delivered',
        'closed',
        'cancelled',
      ].includes(
        salesOrder.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot cancel a ${salesOrder.status} order`,
      });
    }

    salesOrder.status =
      'cancelled';

    salesOrder.cancelledAt =
      new Date();

    salesOrder.cancelledBy =
      req.userId || null;

    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order cancelled successfully',
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'cancelSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const closeSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (
      salesOrder.status !==
      'delivered'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Only delivered orders can be closed',
      });
    }

    salesOrder.status =
      'closed';

    salesOrder.closedAt =
      new Date();

    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order closed successfully',
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'closeSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    salesOrder.deletedAt =
      new Date();

    salesOrder.deletedBy =
      req.userId || null;

    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order deleted successfully',
    });
  } catch (error) {
    console.error(
      'deleteSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const restoreSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const salesOrder =
      await SalesOrder.findOne({
        _id: id,
        companyId,
      });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    if (!salesOrder.deletedAt) {
      return res.status(400).json({
        success: false,
        message:
          'Sales order is not deleted',
      });
    }

    salesOrder.deletedAt = null;
    salesOrder.deletedBy = null;
    salesOrder.updatedBy =
      req.userId || null;

    await salesOrder.save();

    return res.json({
      success: true,
      message:
        'Sales order restored successfully',
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      'restoreSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const duplicateSalesOrder = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const { id } = req.params;

    const source =
      await SalesOrder.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      }).lean();

    if (!source) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found',
      });
    }

    const newOrderNumber =
      await generateOrderNumber(
        companyId
      );

    const duplicateData = {
      ...source,

      _id: undefined,

      orderNumber:
        newOrderNumber,

      status: 'draft',

      paymentStatus: 'unpaid',
      paidAmount: 0,
      balanceAmount:
        source.grandTotal,

      convertedToSales: false,
      salesId: null,

      confirmedAt: null,
      processingAt: null,
      deliveredAt: null,
      cancelledAt: null,
      cancelledBy: null,
      closedAt: null,

      createdBy:
        req.userId || null,

      updatedBy:
        req.userId || null,

      deletedAt: null,
      deletedBy: null,

      createdAt: undefined,
      updatedAt: undefined,
    };

    delete duplicateData._id;

    const duplicate =
      await SalesOrder.create(
        duplicateData
      );

    return res.status(201).json({
      success: true,
      message:
        'Sales order duplicated successfully',
      data: duplicate,
    });
  } catch (error) {
    console.error(
      'duplicateSalesOrder:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getSalesOrdersSummary = async (
  req,
  res
) => {
  try {
    const companyId =
      await getCompanyId(req);

    const match = {
      companyId,
      deletedAt: null,
    };

    const [
      summary,
      statusBreakdown,
    ] = await Promise.all([
      SalesOrder.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            totalOrders: {
              $sum: 1,
            },
            totalValue: {
              $sum: '$grandTotal',
            },
            totalPaid: {
              $sum: '$paidAmount',
            },
            totalBalance: {
              $sum: '$balanceAmount',
            },
          },
        },
      ]),

      SalesOrder.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
            value: {
              $sum: '$grandTotal',
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    const data =
      summary[0] || {
        totalOrders: 0,
        totalValue: 0,
        totalPaid: 0,
        totalBalance: 0,
      };

    return res.json({
      success: true,
      data: {
        totalOrders:
          data.totalOrders || 0,

        totalValue:
          roundNumber(
            data.totalValue || 0
          ),

        totalPaid:
          roundNumber(
            data.totalPaid || 0
          ),

        totalBalance:
          roundNumber(
            data.totalBalance || 0
          ),

        statusBreakdown,
      },
    });
  } catch (error) {
    console.error(
      'getSalesOrdersSummary:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  confirmSalesOrder,
  processSalesOrder,
  markSalesOrderDelivered,
  cancelSalesOrder,
  closeSalesOrder,
  deleteSalesOrder,
  restoreSalesOrder,
  duplicateSalesOrder,
  getSalesOrdersSummary,
};