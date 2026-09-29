const mongoose = require('mongoose');

const Sales = require('../models/sales');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Branch = require('../models/Branch');
const Company = require('../models/Company');


// ============================================================
// TENANT HELPERS
// ============================================================

const getWorkspaceId = (req) => {
  if (!req.companyId) {
    const error = new Error('Workspace not found');
    error.statusCode = 401;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(req.companyId)) {
    const error = new Error('Invalid workspace ID');
    error.statusCode = 400;
    throw error;
  }

  return req.companyId;
};


const getCompany = async (req) => {
  const workspaceId = getWorkspaceId(req);

  const company = await Company.findOne({
    workspaceId,
    status: 'active',
  })
    .select('_id workspaceId status name')
    .lean();

  if (!company) {
    const error = new Error('Company not found');
    error.statusCode = 404;
    throw error;
  }

  return company;
};


const getCompanyId = async (req) => {
  const company = await getCompany(req);

  return company._id;
};


// ============================================================
// GENERIC HELPERS
// ============================================================

const validateObjectId = (id, fieldName) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
};


const normalizeNumber = (
  value,
  defaultValue = 0
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
};


const roundAmount = (value) => {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;
};


const getErrorStatus = (error) => {
  return error.statusCode || 500;
};


// ============================================================
// PAYMENT STATUS
// ============================================================

const calculatePaymentStatus = (
  paidAmount,
  grandTotal
) => {
  const paid = roundAmount(paidAmount);
  const total = roundAmount(grandTotal);

  if (paid <= 0) {
    return 'unpaid';
  }

  if (paid >= total) {
    return 'paid';
  }

  return 'partial';
};


// ============================================================
// ITEM CALCULATION
// ============================================================

const calculateItem = (item) => {
  const quantity = normalizeNumber(
    item.quantity,
    0
  );

  const unitPrice = normalizeNumber(
    item.unitPrice,
    0
  );

  const discountPercent = normalizeNumber(
    item.discountPercent,
    0
  );

  const taxPercent = normalizeNumber(
    item.taxPercent,
    0
  );

  if (quantity <= 0) {
    const error = new Error(
      'Item quantity must be greater than 0'
    );

    error.statusCode = 400;

    throw error;
  }

  if (unitPrice < 0) {
    const error = new Error(
      'Item unit price cannot be negative'
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    discountPercent < 0 ||
    discountPercent > 100
  ) {
    const error = new Error(
      'Discount percent must be between 0 and 100'
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    taxPercent < 0 ||
    taxPercent > 100
  ) {
    const error = new Error(
      'Tax percent must be between 0 and 100'
    );

    error.statusCode = 400;

    throw error;
  }

  const grossAmount = roundAmount(
    quantity * unitPrice
  );

  const discountAmount = roundAmount(
    grossAmount *
      (discountPercent / 100)
  );

  const taxableAmount = roundAmount(
    grossAmount -
      discountAmount
  );

  const taxAmount = roundAmount(
    taxableAmount *
      (taxPercent / 100)
  );

  const lineTotal = roundAmount(
    taxableAmount +
      taxAmount
  );

  return {
    ...item,

    quantity,

    unitPrice,

    discountPercent,

    discountAmount,

    taxableAmount,

    taxPercent,

    taxAmount,

    lineTotal,
  };
};


// ============================================================
// TOTAL CALCULATION
// ============================================================

const calculateTotals = (
  items,
  data = {}
) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    const error = new Error(
      'At least one sale item is required'
    );

    error.statusCode = 400;

    throw error;
  }

  const calculatedItems =
    items.map(calculateItem);

  const subtotal = roundAmount(
    calculatedItems.reduce(
      (total, item) =>
        total +
        item.quantity *
          item.unitPrice,
      0
    )
  );

  const discountAmount =
    roundAmount(
      calculatedItems.reduce(
        (total, item) =>
          total +
          item.discountAmount,
        0
      )
    );

  const taxableAmount =
    roundAmount(
      calculatedItems.reduce(
        (total, item) =>
          total +
          item.taxableAmount,
        0
      )
    );

  const taxAmount =
    roundAmount(
      calculatedItems.reduce(
        (total, item) =>
          total +
          item.taxAmount,
        0
      )
    );

  const shippingAmount =
    roundAmount(
      normalizeNumber(
        data.shippingAmount,
        0
      )
    );

  const otherCharges =
    roundAmount(
      normalizeNumber(
        data.otherCharges,
        0
      )
    );

  const adjustmentAmount =
    roundAmount(
      normalizeNumber(
        data.adjustmentAmount,
        0
      )
    );

  const grandTotal =
    roundAmount(
      taxableAmount +
        taxAmount +
        shippingAmount +
        otherCharges +
        adjustmentAmount
    );

  const paidAmount =
    roundAmount(
      normalizeNumber(
        data.paidAmount,
        0
      )
    );

  if (paidAmount < 0) {
    const error = new Error(
      'Paid amount cannot be negative'
    );

    error.statusCode = 400;

    throw error;
  }

  if (paidAmount > grandTotal) {
    const error = new Error(
      'Paid amount cannot be greater than grand total'
    );

    error.statusCode = 400;

    throw error;
  }

  const balanceAmount =
    roundAmount(
      grandTotal -
        paidAmount
    );

  return {
    items: calculatedItems,

    subtotal,

    discountAmount,

    taxableAmount,

    taxAmount,

    shippingAmount,

    otherCharges,

    adjustmentAmount,

    grandTotal,

    paidAmount,

    balanceAmount,

    paymentStatus:
      calculatePaymentStatus(
        paidAmount,
        grandTotal
      ),
  };
};


// ============================================================
// INVOICE NUMBER
// ============================================================

const getNextInvoiceNumber =
  async (companyId) => {
    const year =
      new Date().getFullYear();

    const prefix =
      `INV-${year}-`;

    const latestSale =
      await Sales.findOne({
        companyId,

        invoiceNumber: {
          $regex:
            `^${prefix}`,
          $options: 'i',
        },

        deletedAt: null,
      })
        .sort({
          createdAt: -1,
        })
        .select(
          'invoiceNumber'
        )
        .lean();

    let nextNumber = 1;

    if (
      latestSale &&
      latestSale.invoiceNumber
    ) {
      const match =
        latestSale.invoiceNumber.match(
          new RegExp(
            `^${prefix}(\\d+)$`,
            'i'
          )
        );

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    let invoiceNumber =
      `${prefix}${String(
        nextNumber
      ).padStart(5, '0')}`;

    let exists =
      await Sales.exists({
        companyId,

        invoiceNumber,

        deletedAt: null,
      });

    while (exists) {
      nextNumber++;

      invoiceNumber =
        `${prefix}${String(
          nextNumber
        ).padStart(5, '0')}`;

      exists =
        await Sales.exists({
          companyId,

          invoiceNumber,

          deletedAt: null,
        });
    }

    return invoiceNumber;
  };


// ============================================================
// CUSTOMER
// Customer.companyId = WORKSPACE ID
// ============================================================

const validateCustomer =
  async (
    customerId,
    workspaceId
  ) => {
    validateObjectId(
      customerId,
      'customer ID'
    );

    const customer =
      await Customer.findOne({
        _id: customerId,

        companyId:
          workspaceId,

        status: 'active',

        deletedAt: null,
      }).lean();

    if (!customer) {
      const error = new Error(
        'Customer not found'
      );

      error.statusCode = 404;

      throw error;
    }

    return customer;
  };


// ============================================================
// BRANCH
// Branch.companyId = ACTUAL COMPANY ID
// ============================================================

const validateBranch =
  async (
    branchId,
    companyId
  ) => {
    if (!branchId) {
      return null;
    }

    validateObjectId(
      branchId,
      'branch ID'
    );

    const branch =
      await Branch.findOne({
        _id: branchId,

        companyId,

        status: 'active',
      }).lean();

    if (!branch) {
      const error = new Error(
        'Branch not found'
      );

      error.statusCode = 404;

      throw error;
    }

    return branch;
  };


// ============================================================
// PRODUCT
// Product.companyId = ACTUAL COMPANY ID
// ============================================================

const validateProducts =
  async (
    items,
    companyId
  ) => {
    const productIds = [
      ...new Set(
        items.map(
          (item) =>
            String(
              item.productId
            )
        )
      ),
    ];

    productIds.forEach(
      (productId) => {
        validateObjectId(
          productId,
          'product ID'
        );
      }
    );

    const products =
      await Product.find({
        _id: {
          $in: productIds,
        },

        companyId,

        status: 'active',

        deletedAt: null,
      }).lean();

    const productMap =
      new Map(
        products.map(
          (product) => [
            String(
              product._id
            ),
            product,
          ]
        )
      );

    for (
      const productId of productIds
    ) {
      if (
        !productMap.has(
          String(productId)
        )
      ) {
        const error =
          new Error(
            `Product not found: ${productId}`
          );

        error.statusCode = 404;

        throw error;
      }
    }

    return productMap;
  };


// ============================================================
// PREPARE ITEMS
// ============================================================

const prepareItems =
  async (
    items,
    companyId
  ) => {
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      const error = new Error(
        'At least one sale item is required'
      );

      error.statusCode = 400;

      throw error;
    }

    const productMap =
      await validateProducts(
        items,
        companyId
      );

    return items.map(
      (item) => {
        const product =
          productMap.get(
            String(
              item.productId
            )
          );

        return {
          productId:
            product._id,

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
            '',

          description:
            item.description ||
            product.description ||
            '',

          quantity:
            item.quantity,

          unit:
            item.unit ||
            product.unit ||
            'pcs',

          unitPrice:
            item.unitPrice !==
            undefined
              ? item.unitPrice
              : (
                  product.sellingPrice ??
                  product.mrp ??
                  0
                ),

          discountPercent:
            item.discountPercent ??
            0,

          taxPercent:
            item.taxPercent ??
            product.gstRate ??
            0,
        };
      }
    );
  };


// ============================================================
// INVENTORY
//
// Product.companyId = actual company ID
// Inventory may have older workspace/company structure.
// This helper checks both safely.
// ============================================================

const getInventory =
  async (
    workspaceId,
    companyId,
    productId,
    branchId,
    session = null
  ) => {
    const companyIds = [
      companyId,
      workspaceId,
    ]
      .filter(Boolean)
      .map(
        (id) =>
          String(id)
      );

    const uniqueCompanyIds =
      [
        ...new Set(
          companyIds
        ),
      ];

    const query = {
      companyId: {
        $in:
          uniqueCompanyIds.map(
            (id) =>
              new mongoose.Types.ObjectId(
                id
              )
          ),
      },

      productId,

      status: 'active',

      deletedAt: null,
    };

    if (branchId) {
      query.branchId =
        branchId;
    } else {
      query.branchId =
        null;
    }

    let inventoryQuery =
      Inventory.findOne(
        query
      );

    if (session) {
      inventoryQuery =
        inventoryQuery.session(
          session
        );
    }

    return inventoryQuery;
  };


// ============================================================
// STOCK MOVEMENT
// Uses the same companyId stored by Inventory.
// ============================================================

const createStockMovement =
  async ({
    companyId,
    branchId,
    inventoryId,
    productId,
    quantity,
    movementType,
    direction,
    referenceId,
    referenceNumber,
    createdBy,
    session,
  }) => {
    const movementData = {
      companyId,

      branchId:
        branchId || null,

      inventoryId,

      productId,

      quantity,

      movementType,

      direction,

      referenceId,

      referenceNumber,

      createdBy,

      performedBy:
        createdBy || null,
    };

    if (session) {
      return StockMovement.create(
        [movementData],
        {
          session,
        }
      );
    }

    return StockMovement.create(
      movementData
    );
  };


// ============================================================
// DEDUCT STOCK
// ============================================================

const deductStock =
  async ({
    workspaceId,
    companyId,
    branchId,
    items,
    sale,
    createdBy,
    session,
  }) => {
    for (
      const item of items
    ) {
      const inventory =
        await getInventory(
          workspaceId,
          companyId,
          item.productId,
          branchId,
          session
        );

      if (!inventory) {
        const error =
          new Error(
            `Inventory not found for product ${item.productName || item.productId}`
          );

        error.statusCode = 404;

        throw error;
      }

      const currentOnHand =
        normalizeNumber(
          inventory.onHand,
          0
        );

      const currentAvailable =
        normalizeNumber(
          inventory.available,
          currentOnHand
        );

      const quantity =
        normalizeNumber(
          item.quantity,
          0
        );

      if (
        currentOnHand <
        quantity
      ) {
        const error =
          new Error(
            `Insufficient stock for ${item.productName || item.productId}. Available: ${currentOnHand}, Required: ${quantity}`
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        currentAvailable <
        quantity
      ) {
        const error =
          new Error(
            `Insufficient available stock for ${item.productName || item.productId}. Available: ${currentAvailable}, Required: ${quantity}`
          );

        error.statusCode = 400;

        throw error;
      }

      inventory.onHand =
        roundAmount(
          currentOnHand -
            quantity
        );

      inventory.available =
        roundAmount(
          currentAvailable -
            quantity
        );

      inventory.lastStockOutAt =
        new Date();

      inventory.updatedBy =
        createdBy;

      await inventory.save({
        session,
      });

      await createStockMovement({
        companyId:
          inventory.companyId,

        branchId,

        inventoryId:
          inventory._id,

        productId:
          item.productId,

        quantity,

        movementType:
          'sale',

        direction:
          'out',

        referenceId:
          sale._id,

        referenceNumber:
          sale.invoiceNumber,

        createdBy,

        session,
      });
    }
  };


// ============================================================
// RESTORE STOCK
// ============================================================

const restoreStock =
  async ({
    workspaceId,
    companyId,
    branchId,
    items,
    sale,
    createdBy,
    session,
  }) => {
    for (
      const item of items
    ) {
      const inventory =
        await getInventory(
          workspaceId,
          companyId,
          item.productId,
          branchId,
          session
        );

      if (!inventory) {
        const error =
          new Error(
            `Inventory not found for product ${item.productName || item.productId}`
          );

        error.statusCode = 404;

        throw error;
      }

      const quantity =
        normalizeNumber(
          item.quantity,
          0
        );

      inventory.onHand =
        roundAmount(
          normalizeNumber(
            inventory.onHand,
            0
          ) + quantity
        );

      inventory.available =
        roundAmount(
          normalizeNumber(
            inventory.available,
            0
          ) + quantity
        );

      inventory.lastStockInAt =
        new Date();

      inventory.updatedBy =
        createdBy;

      await inventory.save({
        session,
      });

      await createStockMovement({
        companyId:
          inventory.companyId,

        branchId,

        inventoryId:
          inventory._id,

        productId:
          item.productId,

        quantity,

        movementType:
          'sales_return',

        direction:
          'in',

        referenceId:
          sale._id,

        referenceNumber:
          sale.invoiceNumber,

        createdBy,

        session,
      });
    }
  };


// ============================================================
// CREATE SALE
// POST /api/sales
// ============================================================

const createSale =
  async (req, res) => {
    try {
      const workspaceId =
        getWorkspaceId(req);

      const companyId =
        await getCompanyId(req);

      const {
        customerId,

        branchId,

        saleDate,

        dueDate,

        referenceNumber,

        status = 'draft',

        paymentStatus = 'unpaid',

        paymentMethod = '',

        items,

        shippingAmount = 0,

        otherCharges = 0,

        adjustmentAmount = 0,

        paidAmount = 0,

        currency = 'INR',

        billingAddress,

        shippingAddress,

        notes = '',

        termsAndConditions = '',
      } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message:
            'Customer is required',
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'At least one sale item is required',
        });
      }

      const customer =
        await validateCustomer(
          customerId,
          workspaceId
        );

      const branch =
        await validateBranch(
          branchId,
          companyId
        );

      const preparedItems =
        await prepareItems(
          items,
          companyId
        );

      const totals =
        calculateTotals(
          preparedItems,
          {
            shippingAmount,

            otherCharges,

            adjustmentAmount,

            paidAmount,
          }
        );

      const invoiceNumber =
        await getNextInvoiceNumber(
          companyId
        );

      const sale =
        await Sales.create({
          companyId,

          branchId:
            branch?._id ||
            null,

          customerId:
            customer._id,

          invoiceNumber,

          referenceNumber:
            referenceNumber ||
            '',

          saleDate:
            saleDate ||
            new Date(),

          dueDate:
            dueDate || null,

          status,

          paymentStatus:
            totals.paymentStatus,

          paymentMethod:
            paymentMethod ||
            '',

          items:
            totals.items,

          subtotal:
            totals.subtotal,

          discountAmount:
            totals.discountAmount,

          taxableAmount:
            totals.taxableAmount,

          taxAmount:
            totals.taxAmount,

          shippingAmount:
            totals.shippingAmount,

          otherCharges:
            totals.otherCharges,

          adjustmentAmount:
            totals.adjustmentAmount,

          grandTotal:
            totals.grandTotal,

          paidAmount:
            totals.paidAmount,

          balanceAmount:
            totals.balanceAmount,

          currency:
            currency ||
            'INR',

          billingAddress:
            billingAddress ||
            customer.billingAddress ||
            {},

          shippingAddress:
            shippingAddress ||
            customer.shippingAddress ||
            {},

          notes,

          termsAndConditions,

          stockUpdated:
            false,

          createdBy:
            req.userId,

          updatedBy:
            req.userId,
        });

      return res.status(201).json({
        success: true,

        message:
          'Sale created successfully',

        data: sale,
      });
    } catch (error) {
      console.error(
        'Create sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to create sale',
      });
    }
  };


// ============================================================
// GET SALES
// GET /api/sales
// ============================================================

const getSales =
  async (req, res) => {
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

        fromDate,

        toDate,
      } = req.query;

      const pageNumber =
        Math.max(
          1,
          Number(page) || 1
        );

      const limitNumber =
        Math.min(
          100,
          Math.max(
            1,
            Number(limit) || 20
          )
        );

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const query = {
        companyId,

        deletedAt: null,
      };

      if (
        search &&
        search.trim()
      ) {
        query.$or = [
          {
            invoiceNumber: {
              $regex:
                search.trim(),
              $options: 'i',
            },
          },

          {
            referenceNumber: {
              $regex:
                search.trim(),
              $options: 'i',
            },
          },
        ];
      }

      if (status) {
        query.status =
          status;
      }

      if (paymentStatus) {
        query.paymentStatus =
          paymentStatus;
      }

      if (customerId) {
        validateObjectId(
          customerId,
          'customer ID'
        );

        query.customerId =
          customerId;
      }

      if (branchId) {
        validateObjectId(
          branchId,
          'branch ID'
        );

        query.branchId =
          branchId;
      }

      if (
        fromDate ||
        toDate
      ) {
        query.saleDate = {};

        if (fromDate) {
          const start =
            new Date(
              fromDate
            );

          if (
            Number.isNaN(
              start.getTime()
            )
          ) {
            return res.status(400)
              .json({
                success: false,
                message:
                  'Invalid fromDate',
              });
          }

          query.saleDate.$gte =
            start;
        }

        if (toDate) {
          const end =
            new Date(
              toDate
            );

          if (
            Number.isNaN(
              end.getTime()
            )
          ) {
            return res.status(400)
              .json({
                success: false,
                message:
                  'Invalid toDate',
              });
          }

          end.setHours(
            23,
            59,
            59,
            999
          );

          query.saleDate.$lte =
            end;
        }
      }

      const [
        sales,
        total,
      ] = await Promise.all([
        Sales.find(query)
          .populate(
            'customerId',
            'customerCode name displayName email phone'
          )
          .populate(
            'branchId',
            'name code'
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Sales.countDocuments(
          query
        ),
      ]);

      return res.json({
        success: true,

        data: sales,

        pagination: {
          page:
            pageNumber,

          limit:
            limitNumber,

          total,

          pages:
            Math.ceil(
              total /
                limitNumber
            ),

          totalPages:
            Math.ceil(
              total /
                limitNumber
            ),

          hasNextPage:
            pageNumber <
            Math.ceil(
              total /
                limitNumber
            ),

          hasPreviousPage:
            pageNumber > 1,
        },
      });
    } catch (error) {
      console.error(
        'Get sales error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to fetch sales',
      });
    }
  };


// ============================================================
// GET SALE BY ID
// GET /api/sales/:id
// ============================================================

const getSaleById =
  async (req, res) => {
    try {
      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,

          deletedAt: null,
        })
          .populate(
            'customerId'
          )
          .populate(
            'branchId'
          )
          .lean();

      if (!sale) {
        return res.status(404)
          .json({
            success: false,
            message:
              'Sale not found',
          });
      }

      return res.json({
        success: true,

        data: sale,
      });
    } catch (error) {
      console.error(
        'Get sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to fetch sale',
      });
    }
  };


// ============================================================
// UPDATE SALE
// PUT /api/sales/:id
// ============================================================

const updateSale =
  async (req, res) => {
    try {
      const workspaceId =
        getWorkspaceId(req);

      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,

          deletedAt: null,
        });

      if (!sale) {
        return res.status(404)
          .json({
            success: false,
            message:
              'Sale not found',
          });
      }

      if (
        sale.status !==
        'draft'
      ) {
        return res.status(400)
          .json({
            success: false,
            message:
              'Only draft sales can be updated',
          });
      }

      const body =
        req.body || {};

      if (
        body.customerId
      ) {
        await validateCustomer(
          body.customerId,
          workspaceId
        );

        sale.customerId =
          body.customerId;
      }

      if (
        body.branchId !==
        undefined
      ) {
        const branch =
          await validateBranch(
            body.branchId,
            companyId
          );

        sale.branchId =
          branch?._id ||
          null;
      }

      if (
        body.items !==
        undefined
      ) {
        const preparedItems =
          await prepareItems(
            body.items,
            companyId
          );

        const totals =
          calculateTotals(
            preparedItems,
            {
              shippingAmount:
                body.shippingAmount ??
                sale.shippingAmount,

              otherCharges:
                body.otherCharges ??
                sale.otherCharges,

              adjustmentAmount:
                body.adjustmentAmount ??
                sale.adjustmentAmount,

              paidAmount:
                body.paidAmount ??
                sale.paidAmount,
            }
          );

        sale.items =
          totals.items;

        sale.subtotal =
          totals.subtotal;

        sale.discountAmount =
          totals.discountAmount;

        sale.taxableAmount =
          totals.taxableAmount;

        sale.taxAmount =
          totals.taxAmount;

        sale.shippingAmount =
          totals.shippingAmount;

        sale.otherCharges =
          totals.otherCharges;

        sale.adjustmentAmount =
          totals.adjustmentAmount;

        sale.grandTotal =
          totals.grandTotal;

        sale.paidAmount =
          totals.paidAmount;

        sale.balanceAmount =
          totals.balanceAmount;

        sale.paymentStatus =
          totals.paymentStatus;
      }

      const allowedFields = [
        'referenceNumber',

        'saleDate',

        'dueDate',

        'paymentMethod',

        'currency',

        'billingAddress',

        'shippingAddress',

        'notes',

        'termsAndConditions',
      ];

      allowedFields.forEach(
        (field) => {
          if (
            body[field] !==
            undefined
          ) {
            sale[field] =
              body[field];
          }
        }
      );

      if (
        body.shippingAmount !==
          undefined ||
        body.otherCharges !==
          undefined ||
        body.adjustmentAmount !==
          undefined ||
        body.paidAmount !==
          undefined
      ) {
        const totals =
          calculateTotals(
            sale.items,
            {
              shippingAmount:
                body.shippingAmount ??
                sale.shippingAmount,

              otherCharges:
                body.otherCharges ??
                sale.otherCharges,

              adjustmentAmount:
                body.adjustmentAmount ??
                sale.adjustmentAmount,

              paidAmount:
                body.paidAmount ??
                sale.paidAmount,
            }
          );

        sale.subtotal =
          totals.subtotal;

        sale.discountAmount =
          totals.discountAmount;

        sale.taxableAmount =
          totals.taxableAmount;

        sale.taxAmount =
          totals.taxAmount;

        sale.shippingAmount =
          totals.shippingAmount;

        sale.otherCharges =
          totals.otherCharges;

        sale.adjustmentAmount =
          totals.adjustmentAmount;

        sale.grandTotal =
          totals.grandTotal;

        sale.paidAmount =
          totals.paidAmount;

        sale.balanceAmount =
          totals.balanceAmount;

        sale.paymentStatus =
          totals.paymentStatus;
      }

      if (
        body.paymentStatus !==
        undefined
      ) {
        // Payment status is calculated
        // automatically from paidAmount.
        sale.paymentStatus =
          calculatePaymentStatus(
            sale.paidAmount,
            sale.grandTotal
          );
      }

      sale.updatedBy =
        req.userId;

      await sale.save();

      return res.json({
        success: true,

        message:
          'Sale updated successfully',

        data: sale,
      });
    } catch (error) {
      console.error(
        'Update sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to update sale',
      });
    }
  };


// ============================================================
// CONFIRM SALE
// POST /api/sales/:id/confirm
// ============================================================

const confirmSale =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const workspaceId =
        getWorkspaceId(req);

      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      session.startTransaction();

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,

          deletedAt: null,
        }).session(session);

      if (!sale) {
        const error =
          new Error(
            'Sale not found'
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        sale.status !==
        'draft'
      ) {
        const error =
          new Error(
            'Only draft sales can be confirmed'
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        sale.stockUpdated
      ) {
        const error =
          new Error(
            'Stock has already been updated for this sale'
          );

        error.statusCode = 400;

        throw error;
      }

      await deductStock({
        workspaceId,

        companyId,

        branchId:
          sale.branchId ||
          null,

        items:
          sale.items,

        sale,

        createdBy:
          req.userId,

        session,
      });

      sale.status =
        'confirmed';

      sale.stockUpdated =
        true;

      sale.stockUpdatedAt =
        new Date();

      sale.updatedBy =
        req.userId;

      await sale.save({
        session,
      });

      await session.commitTransaction();

      return res.json({
        success: true,

        message:
          'Sale confirmed and stock deducted successfully',

        data: sale,
      });
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch (_) {
        // Transaction may already be completed.
      }

      console.error(
        'Confirm sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to confirm sale',
      });
    } finally {
      await session.endSession();
    }
  };


// ============================================================
// COMPLETE SALE
// POST /api/sales/:id/complete
// ============================================================

const completeSale =
  async (req, res) => {
    try {
      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,

          deletedAt: null,
        });

      if (!sale) {
        return res.status(404)
          .json({
            success: false,
            message:
              'Sale not found',
          });
      }

      if (
        sale.status !==
        'confirmed'
      ) {
        return res.status(400)
          .json({
            success: false,
            message:
              'Only confirmed sales can be completed',
          });
      }

      sale.status =
        'completed';

      sale.updatedBy =
        req.userId;

      await sale.save();

      return res.json({
        success: true,

        message:
          'Sale completed successfully',

        data: sale,
      });
    } catch (error) {
      console.error(
        'Complete sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to complete sale',
      });
    }
  };


// ============================================================
// CANCEL SALE
// POST /api/sales/:id/cancel
// ============================================================

const cancelSale =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const workspaceId =
        getWorkspaceId(req);

      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      session.startTransaction();

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,

          deletedAt: null,
        }).session(session);

      if (!sale) {
        const error =
          new Error(
            'Sale not found'
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        sale.status ===
        'cancelled'
      ) {
        const error =
          new Error(
            'Sale is already cancelled'
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        sale.status ===
        'draft'
      ) {
        sale.status =
          'cancelled';

        sale.cancelledAt =
          new Date();

        sale.cancelledBy =
          req.userId;

        sale.updatedBy =
          req.userId;

        await sale.save({
          session,
        });

        await session.commitTransaction();

        return res.json({
          success: true,

          message:
            'Draft sale cancelled successfully',

          data: sale,
        });
      }

      if (
        sale.stockUpdated
      ) {
        await restoreStock({
          workspaceId,

          companyId,

          branchId:
            sale.branchId ||
            null,

          items:
            sale.items,

          sale,

          createdBy:
            req.userId,

          session,
        });

        sale.stockUpdated =
          false;

        sale.stockUpdatedAt =
          null;
      }

      sale.status =
        'cancelled';

      sale.cancelledAt =
        new Date();

      sale.cancelledBy =
        req.userId;

      sale.updatedBy =
        req.userId;

      await sale.save({
        session,
      });

      await session.commitTransaction();

      return res.json({
        success: true,

        message:
          'Sale cancelled and stock restored successfully',

        data: sale,
      });
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch (_) {
        // Transaction may already be completed.
      }

      console.error(
        'Cancel sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to cancel sale',
      });
    } finally {
      await session.endSession();
    }
  };


// ============================================================
// DELETE SALE
// DELETE /api/sales/:id
// ============================================================

const deleteSale =
  async (req, res) => {
    try {
      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,

          deletedAt: null,
        });

      if (!sale) {
        return res.status(404)
          .json({
            success: false,
            message:
              'Sale not found',
          });
      }

      if (
        sale.stockUpdated
      ) {
        return res.status(400)
          .json({
            success: false,

            message:
              'Sale cannot be deleted after stock has been updated. Cancel the sale instead.',
          });
      }

      sale.deletedAt =
        new Date();

      sale.deletedBy =
        req.userId;

      sale.updatedBy =
        req.userId;

      await sale.save();

      return res.json({
        success: true,

        message:
          'Sale deleted successfully',
      });
    } catch (error) {
      console.error(
        'Delete sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to delete sale',
      });
    }
  };


// ============================================================
// RESTORE SALE
// PATCH /api/sales/:id/restore
// ============================================================

const restoreSale =
  async (req, res) => {
    try {
      const companyId =
        await getCompanyId(req);

      validateObjectId(
        req.params.id,
        'sale ID'
      );

      const sale =
        await Sales.findOne({
          _id:
            req.params.id,

          companyId,
        });

      if (!sale) {
        return res.status(404)
          .json({
            success: false,
            message:
              'Sale not found',
          });
      }

      if (!sale.deletedAt) {
        return res.status(400)
          .json({
            success: false,
            message:
              'Sale is not deleted',
          });
      }

      sale.deletedAt =
        null;

      sale.deletedBy =
        null;

      sale.updatedBy =
        req.userId;

      await sale.save();

      return res.json({
        success: true,

        message:
          'Sale restored successfully',

        data: sale,
      });
    } catch (error) {
      console.error(
        'Restore sale error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to restore sale',
      });
    }
  };


// ============================================================
// SALES SUMMARY
// GET /api/sales/summary
// ============================================================

const getSalesSummary =
  async (req, res) => {
    try {
      const companyId =
        await getCompanyId(req);

      const {
        fromDate,
        toDate,
      } = req.query;

      const match = {
        companyId:
          new mongoose.Types.ObjectId(
            companyId
          ),

        deletedAt: null,
      };

      if (
        fromDate ||
        toDate
      ) {
        match.saleDate = {};

        if (fromDate) {
          const start =
            new Date(
              fromDate
            );

          if (
            Number.isNaN(
              start.getTime()
            )
          ) {
            return res.status(400)
              .json({
                success: false,
                message:
                  'Invalid fromDate',
              });
          }

          match.saleDate.$gte =
            start;
        }

        if (toDate) {
          const end =
            new Date(
              toDate
            );

          if (
            Number.isNaN(
              end.getTime()
            )
          ) {
            return res.status(400)
              .json({
                success: false,
                message:
                  'Invalid toDate',
              });
          }

          end.setHours(
            23,
            59,
            59,
            999
          );

          match.saleDate.$lte =
            end;
        }
      }

      const [
        totals,
        statusSummary,
        paymentSummary,
      ] =
        await Promise.all([
          Sales.aggregate([
            {
              $match:
                match,
            },

            {
              $group: {
                _id: null,

                totalSales: {
                  $sum: 1,
                },

                subtotal: {
                  $sum:
                    '$subtotal',
                },

                discountAmount: {
                  $sum:
                    '$discountAmount',
                },

                taxableAmount: {
                  $sum:
                    '$taxableAmount',
                },

                taxAmount: {
                  $sum:
                    '$taxAmount',
                },

                shippingAmount: {
                  $sum:
                    '$shippingAmount',
                },

                otherCharges: {
                  $sum:
                    '$otherCharges',
                },

                grandTotal: {
                  $sum:
                    '$grandTotal',
                },

                paidAmount: {
                  $sum:
                    '$paidAmount',
                },

                balanceAmount: {
                  $sum:
                    '$balanceAmount',
                },
              },
            },
          ]),

          Sales.aggregate([
            {
              $match:
                match,
            },

            {
              $group: {
                _id:
                  '$status',

                count: {
                  $sum: 1,
                },

                amount: {
                  $sum:
                    '$grandTotal',
                },
              },
            },

            {
              $sort: {
                count: -1,
              },
            },
          ]),

          Sales.aggregate([
            {
              $match:
                match,
            },

            {
              $group: {
                _id:
                  '$paymentStatus',

                count: {
                  $sum: 1,
                },

                amount: {
                  $sum:
                    '$grandTotal',
                },

                paidAmount: {
                  $sum:
                    '$paidAmount',
                },

                balanceAmount: {
                  $sum:
                    '$balanceAmount',
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

      return res.json({
        success: true,

        data: {
          totals:
            totals[0] || {
              totalSales: 0,

              subtotal: 0,

              discountAmount: 0,

              taxableAmount: 0,

              taxAmount: 0,

              shippingAmount: 0,

              otherCharges: 0,

              grandTotal: 0,

              paidAmount: 0,

              balanceAmount: 0,
            },

          statusSummary,

          paymentSummary,
        },
      });
    } catch (error) {
      console.error(
        'Sales summary error:',
        error
      );

      return res.status(
        getErrorStatus(error)
      ).json({
        success: false,

        message:
          error.message ||
          'Failed to fetch sales summary',
      });
    }
  };


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createSale,

  getSales,

  getSaleById,

  updateSale,

  confirmSale,

  completeSale,

  cancelSale,

  deleteSale,

  restoreSale,

  getSalesSummary,
};