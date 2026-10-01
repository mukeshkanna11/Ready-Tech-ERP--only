const mongoose = require('mongoose');

const Product = require('../models/Product');
const Branch = require('../models/Branch');
const Company = require('../models/Company');

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// ------------------------------------------------------------
// Resolve logged-in workspace -> actual Company._id
// ------------------------------------------------------------

const getProductCompanyId = async (req) => {
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

  const company = await Company.findOne({
    workspaceId,
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

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeUpperString = (value) => {
  return normalizeString(value).toUpperCase();
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// ------------------------------------------------------------
// Validate branch against actual Company._id
// ------------------------------------------------------------

const validateBranchForCompany = async (
  branchId,
  companyId
) => {
  if (
    branchId === null ||
    branchId === undefined ||
    branchId === ''
  ) {
    return null;
  }

  if (!isValidObjectId(branchId)) {
    const error = new Error('Invalid branch ID');
    error.statusCode = 400;
    throw error;
  }

  const branch = await Branch.findById(branchId)
    .select('_id companyId name branchName code status')
    .lean();

  if (!branch) {
    const error = new Error('Branch not found');
    error.statusCode = 400;
    throw error;
  }

  if (
    branch.status &&
    branch.status !== 'active'
  ) {
    const error = new Error('Branch is inactive');
    error.statusCode = 400;
    throw error;
  }

  const sameCompany =
    branch.companyId &&
    branch.companyId.toString() === companyId.toString();

  const [branchCompany, currentCompany] = sameCompany
    ? []
    : await Promise.all([
        branch.companyId
          ? Company.findById(branch.companyId)
              .select('workspaceId')
              .lean()
          : null,
        Company.findById(companyId)
          .select('workspaceId')
          .lean(),
      ]);

  if (
    !sameCompany &&
    (!branchCompany?.workspaceId ||
      !currentCompany?.workspaceId ||
      branchCompany.workspaceId.toString() !==
        currentCompany.workspaceId.toString())
  ) {
    const error = new Error(
      'Branch does not belong to your company'
    );
    error.statusCode = 400;
    throw error;
  }

  return branch;
};

const parseNonNegativeNumber = (
  value,
  fieldName
) => {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(
      `${fieldName} must be a valid non-negative number`
    );
    error.statusCode = 400;
    throw error;
  }

  return number;
};

const parseGSTRate = (value) => {
  const rate = parseNonNegativeNumber(
    value,
    'GST rate'
  );

  if (rate > 100) {
    const error = new Error(
      'GST rate cannot exceed 100'
    );
    error.statusCode = 400;
    throw error;
  }

  return rate;
};

const validateProductType = (value) => {
  const productType =
    normalizeString(value).toLowerCase() ||
    'product';

  const allowedTypes = [
    'product',
    'service',
    'raw_material',
    'finished_good',
    'semi_finished',
    'consumable',
    'asset',
  ];

  if (!allowedTypes.includes(productType)) {
    const error = new Error(
      `Product type must be one of: ${allowedTypes.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  return productType;
};

const validateStatus = (value) => {
  const status =
    normalizeString(value).toLowerCase() ||
    'active';

  if (!['active', 'inactive'].includes(status)) {
    const error = new Error(
      'Status must be active or inactive'
    );
    error.statusCode = 400;
    throw error;
  }

  return status;
};

const populateProduct = (query) => {
  return query
    .populate({
      path: 'branchId',
      select: '_id name branchName code status',
    })
    .populate({
      path: 'createdBy',
      select: '_id name email',
    })
    .populate({
      path: 'updatedBy',
      select: '_id name email',
    });
};

const sendError = (
  res,
  error,
  fallback
) => {
  console.error(
    'Product controller error:',
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

const handleDuplicateKey = (
  res,
  error
) => {
  if (error?.code !== 11000) {
    return false;
  }

  const keyPattern =
    error.keyPattern || {};

  if (keyPattern.productCode) {
    res.status(409).json({
      success: false,
      message:
        'Product code already exists',
    });

    return true;
  }

  if (keyPattern.sku) {
    res.status(409).json({
      success: false,
      message:
        'SKU already exists',
    });

    return true;
  }

  if (keyPattern.barcode) {
    res.status(409).json({
      success: false,
      message:
        'Barcode already exists',
    });

    return true;
  }

  res.status(409).json({
    success: false,
    message:
      'Product already exists',
  });

  return true;
};

// ============================================================
// CREATE PRODUCT
// ============================================================

const createProduct = async (req, res) => {
  try {
    const companyId =
      await getProductCompanyId(req);

    const userId =
      req.userId || null;

    const {
      productCode,
      sku,
      name,
      displayName,
      productType,
      category,
      brand,
      unit,
      hsnSac,
      gstRate,
      purchasePrice,
      sellingPrice,
      mrp,
      openingStock,
      reorderLevel,
      minimumStock,
      maximumStock,
      barcode,
      description,
      status,
    } = req.body || {};

    const finalProductCode =
      normalizeUpperString(productCode);

    const finalName =
      normalizeString(name);

    if (!finalProductCode) {
      return res.status(400).json({
        success: false,
        message:
          'Product code is required',
      });
    }

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message:
          'Product name is required',
      });
    }

    const finalProductType =
      validateProductType(productType);

    const finalStatus =
      validateStatus(status);

    const finalSKU =
      normalizeUpperString(sku);

    const finalBarcode =
      normalizeString(barcode);

    const finalUnit =
      normalizeUpperString(unit) ||
      'PCS';

    const finalGSTRate =
      parseGSTRate(gstRate);

    const finalPurchasePrice =
      parseNonNegativeNumber(
        purchasePrice,
        'Purchase price'
      );

    const finalSellingPrice =
      parseNonNegativeNumber(
        sellingPrice,
        'Selling price'
      );

    const finalMRP =
      parseNonNegativeNumber(
        mrp,
        'MRP'
      );

    const finalOpeningStock =
      parseNonNegativeNumber(
        openingStock,
        'Opening stock'
      );

    const finalReorderLevel =
      parseNonNegativeNumber(
        reorderLevel,
        'Reorder level'
      );

    const finalMinimumStock =
      parseNonNegativeNumber(
        minimumStock,
        'Minimum stock'
      );

    const finalMaximumStock =
      parseNonNegativeNumber(
        maximumStock,
        'Maximum stock'
      );

    if (
      finalMaximumStock > 0 &&
      finalMinimumStock > finalMaximumStock
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Minimum stock cannot be greater than maximum stock',
      });
    }

    if (
      finalMRP > 0 &&
      finalSellingPrice > finalMRP
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Selling price cannot be greater than MRP',
      });
    }

    const branchId =
      getBranchIdFromRequest(req);

    await validateBranchForCompany(
      branchId,
      companyId
    );

    // ----------------------------------------------------------
    // Duplicate product code
    // ----------------------------------------------------------

    const existingProduct =
      await Product.findOne({
        companyId,
        productCode:
          finalProductCode,
        deletedAt: null,
      })
        .select('_id')
        .lean();

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message:
          'Product code already exists',
      });
    }

    // ----------------------------------------------------------
    // Duplicate SKU
    // ----------------------------------------------------------

    if (finalSKU) {
      const existingSKU =
        await Product.findOne({
          companyId,
          sku: finalSKU,
          deletedAt: null,
        })
          .select('_id')
          .lean();

      if (existingSKU) {
        return res.status(409).json({
          success: false,
          message:
            'SKU already exists',
        });
      }
    }

    // ----------------------------------------------------------
    // Duplicate barcode
    // ----------------------------------------------------------

    if (finalBarcode) {
      const existingBarcode =
        await Product.findOne({
          companyId,
          barcode: finalBarcode,
          deletedAt: null,
        })
          .select('_id')
          .lean();

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message:
            'Barcode already exists',
        });
      }
    }

    // ----------------------------------------------------------
    // Create product
    // ----------------------------------------------------------

    const product =
      await Product.create({
        companyId,
        branchId:
          branchId || null,
        productCode:
          finalProductCode,
        sku:
          finalSKU,
        name:
          finalName,
        displayName:
          normalizeString(displayName),
        productType:
          finalProductType,
        category:
          normalizeString(category),
        brand:
          normalizeString(brand),
        unit:
          finalUnit,
        hsnSac:
          normalizeUpperString(hsnSac),
        gstRate:
          finalGSTRate,
        purchasePrice:
          finalPurchasePrice,
        sellingPrice:
          finalSellingPrice,
        mrp:
          finalMRP,
        openingStock:
          finalOpeningStock,
        reorderLevel:
          finalReorderLevel,
        minimumStock:
          finalMinimumStock,
        maximumStock:
          finalMaximumStock,
        barcode:
          finalBarcode,
        description:
          normalizeString(description),
        status:
          finalStatus,
        createdBy:
          userId,
        updatedBy:
          userId,
      });

    const populatedProduct =
      await populateProduct(
        Product.findOne({
          _id: product._id,
          companyId,
          deletedAt: null,
        })
      ).lean();

    return res.status(201).json({
      success: true,
      message:
        'Product created successfully',
      data: populatedProduct,
    });
  } catch (error) {
    if (
      handleDuplicateKey(
        res,
        error
      )
    ) {
      return;
    }

    return sendError(
      res,
      error,
      'Unable to create product'
    );
  }
};

// ============================================================
// LIST PRODUCTS
// ============================================================

// ============================================================
// LIST PRODUCTS
// ============================================================

const getProducts = async (
  req,
  res
) => {
  try {
    const companyId =
      await getProductCompanyId(req);

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

    const productType =
      normalizeString(
        req.query.productType
      ).toLowerCase();

    const category =
      normalizeString(
        req.query.category
      );

    const brand =
      normalizeString(
        req.query.brand
      );

    const branchId =
      normalizeString(
        req.query.branchId
      );

    // ----------------------------------------------------------
    // BASE TENANT FILTER
    // ----------------------------------------------------------

    const filter = {
      companyId,
      deletedAt: null,
    };

    // ----------------------------------------------------------
    // STATUS FILTER
    // ----------------------------------------------------------

    if (
      status &&
      ['active', 'inactive'].includes(
        status
      )
    ) {
      filter.status = status;
    }

    // ----------------------------------------------------------
    // PRODUCT TYPE FILTER
    // ----------------------------------------------------------

    if (
      productType &&
      [
        'product',
        'service',
        'raw_material',
        'finished_good',
        'semi_finished',
        'consumable',
        'asset',
      ].includes(productType)
    ) {
      filter.productType =
        productType;
    }

    // ----------------------------------------------------------
    // CATEGORY FILTER
    // ----------------------------------------------------------

    if (category) {
      filter.category =
        category;
    }

    // ----------------------------------------------------------
    // BRAND FILTER
    // ----------------------------------------------------------

    if (brand) {
      filter.brand =
        brand;
    }

    // ----------------------------------------------------------
    // BRANCH FILTER
    // ----------------------------------------------------------

    if (branchId) {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid branch ID',
        });
      }

      await validateBranchForCompany(
        branchId,
        companyId
      );

      filter.branchId =
        branchId;
    }

    // ----------------------------------------------------------
    // SEARCH FILTER
    // ----------------------------------------------------------

    if (search) {
      const regex =
        new RegExp(
          escapeRegex(search),
          'i'
        );

      filter.$or = [
        {
          productCode: regex,
        },
        {
          sku: regex,
        },
        {
          name: regex,
        },
        {
          displayName: regex,
        },
        {
          category: regex,
        },
        {
          brand: regex,
        },
        {
          barcode: regex,
        },
        {
          hsnSac: regex,
        },
        {
          description: regex,
        },
      ];
    }

    // ----------------------------------------------------------
    // FETCH PRODUCTS + TOTAL
    // ----------------------------------------------------------

    const [
      products,
      total,
    ] = await Promise.all([
      populateProduct(
        Product.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
      ).lean(),

      Product.countDocuments(filter),
    ]);

    // ----------------------------------------------------------
    // PAGINATION
    // ----------------------------------------------------------

    const totalPages =
      total > 0
        ? Math.ceil(total / limit)
        : 0;

    return res.status(200).json({
      success: true,
      data: products,
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
      'Unable to fetch products'
    );
  }
};

// ============================================================
// GET PRODUCT BY ID
// ============================================================

const getProductById = async (
  req,
  res
) => {
  try {
    const companyId =
      await getProductCompanyId(req);

    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid product ID',
      });
    }

    const product =
      await populateProduct(
        Product.findOne({
          _id: id,
          companyId,
          deletedAt: null,
        })
      ).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to fetch product'
    );
  }
};

// ============================================================
// UPDATE PRODUCT
// ============================================================

const updateProduct = async (
  req,
  res
) => {
  try {
    const companyId =
      await getProductCompanyId(req);

    const userId =
      req.userId || null;

    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid product ID',
      });
    }

    const product =
      await Product.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          'Product not found',
      });
    }

    const body =
      req.body || {};

    // ----------------------------------------------------------
    // Product code
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'productCode'
      )
    ) {
      const newProductCode =
        normalizeUpperString(
          body.productCode
        );

      if (!newProductCode) {
        return res.status(400).json({
          success: false,
          message:
            'Product code cannot be empty',
        });
      }

      if (
        newProductCode !==
        product.productCode
      ) {
        const duplicate =
          await Product.findOne({
            _id: {
              $ne: id,
            },
            companyId,
            productCode:
              newProductCode,
            deletedAt: null,
          })
            .select('_id')
            .lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              'Product code already exists',
          });
        }
      }

      product.productCode =
        newProductCode;
    }

    // ----------------------------------------------------------
    // SKU
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'sku'
      )
    ) {
      const newSKU =
        normalizeUpperString(
          body.sku
        );

      if (
        newSKU &&
        newSKU !== product.sku
      ) {
        const duplicate =
          await Product.findOne({
            _id: {
              $ne: id,
            },
            companyId,
            sku: newSKU,
            deletedAt: null,
          })
            .select('_id')
            .lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              'SKU already exists',
          });
        }
      }

      product.sku =
        newSKU;
    }

    // ----------------------------------------------------------
    // Name
    // ----------------------------------------------------------

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
            'Product name cannot be empty',
        });
      }

      product.name =
        name;
    }

    // ----------------------------------------------------------
    // Simple string fields
    // ----------------------------------------------------------

    const stringFields = [
      'displayName',
      'category',
      'brand',
      'description',
    ];

    stringFields.forEach(
      (field) => {
        if (
          Object.prototype.hasOwnProperty.call(
            body,
            field
          )
        ) {
          product[field] =
            normalizeString(
              body[field]
            );
        }
      }
    );

    // ----------------------------------------------------------
    // Unit
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'unit'
      )
    ) {
      const unit =
        normalizeUpperString(
          body.unit
        );

      if (!unit) {
        return res.status(400).json({
          success: false,
          message:
            'Unit cannot be empty',
        });
      }

      product.unit =
        unit;
    }

    // ----------------------------------------------------------
    // HSN / SAC
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'hsnSac'
      )
    ) {
      product.hsnSac =
        normalizeUpperString(
          body.hsnSac
        );
    }

    // ----------------------------------------------------------
    // Product type
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'productType'
      )
    ) {
      product.productType =
        validateProductType(
          body.productType
        );
    }

    // ----------------------------------------------------------
    // GST
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'gstRate'
      )
    ) {
      product.gstRate =
        parseGSTRate(
          body.gstRate
        );
    }

    // ----------------------------------------------------------
    // Prices
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'purchasePrice'
      )
    ) {
      product.purchasePrice =
        parseNonNegativeNumber(
          body.purchasePrice,
          'Purchase price'
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'sellingPrice'
      )
    ) {
      product.sellingPrice =
        parseNonNegativeNumber(
          body.sellingPrice,
          'Selling price'
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'mrp'
      )
    ) {
      product.mrp =
        parseNonNegativeNumber(
          body.mrp,
          'MRP'
        );
    }

    // ----------------------------------------------------------
    // Stock thresholds
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'openingStock'
      )
    ) {
      product.openingStock =
        parseNonNegativeNumber(
          body.openingStock,
          'Opening stock'
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'reorderLevel'
      )
    ) {
      product.reorderLevel =
        parseNonNegativeNumber(
          body.reorderLevel,
          'Reorder level'
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'minimumStock'
      )
    ) {
      product.minimumStock =
        parseNonNegativeNumber(
          body.minimumStock,
          'Minimum stock'
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'maximumStock'
      )
    ) {
      product.maximumStock =
        parseNonNegativeNumber(
          body.maximumStock,
          'Maximum stock'
        );
    }

    if (
      product.maximumStock > 0 &&
      product.minimumStock >
        product.maximumStock
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Minimum stock cannot be greater than maximum stock',
      });
    }

    if (
      product.mrp > 0 &&
      product.sellingPrice >
        product.mrp
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Selling price cannot be greater than MRP',
      });
    }

    // ----------------------------------------------------------
    // Barcode
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'barcode'
      )
    ) {
      const newBarcode =
        normalizeString(
          body.barcode
        );

      if (
        newBarcode &&
        newBarcode !== product.barcode
      ) {
        const duplicate =
          await Product.findOne({
            _id: {
              $ne: id,
            },
            companyId,
            barcode:
              newBarcode,
            deletedAt: null,
          })
            .select('_id')
            .lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              'Barcode already exists',
          });
        }
      }

      product.barcode =
        newBarcode;
    }

    // ----------------------------------------------------------
    // Status
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'status'
      )
    ) {
      product.status =
        validateStatus(
          body.status
        );
    }

    // ----------------------------------------------------------
    // Branch
    // ----------------------------------------------------------

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
        product.branchId =
          null;
      } else {
        await validateBranchForCompany(
          body.branchId,
          companyId
        );

        product.branchId =
          body.branchId;
      }
    }

    product.updatedBy =
      userId;

    await product.save();

    const updatedProduct =
      await populateProduct(
        Product.findOne({
          _id: product._id,
          companyId,
          deletedAt: null,
        })
      ).lean();

    return res.status(200).json({
      success: true,
      message:
        'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    if (
      handleDuplicateKey(
        res,
        error
      )
    ) {
      return;
    }

    return sendError(
      res,
      error,
      'Unable to update product'
    );
  }
};

// ============================================================
// DELETE PRODUCT
// ============================================================

const deleteProduct = async (
  req,
  res
) => {
  try {
    const companyId =
      await getProductCompanyId(req);

    const userId =
      req.userId || null;

    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid product ID',
      });
    }

    const product =
      await Product.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          'Product not found',
      });
    }

    product.deletedAt =
      new Date();

    product.deletedBy =
      userId;

    product.updatedBy =
      userId;

    await product.save();

    return res.status(200).json({
      success: true,
      message:
        'Product deleted successfully',
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to delete product'
    );
  }
};

// ============================================================
// RESTORE PRODUCT
// ============================================================

const restoreProduct = async (
  req,
  res
) => {
  try {
    const companyId =
      await getProductCompanyId(req);

    const userId =
      req.userId || null;

    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid product ID',
      });
    }

    const product =
      await Product.findOne({
        _id: id,
        companyId,
        deletedAt: {
          $ne: null,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          'Deleted product not found',
      });
    }

    // ----------------------------------------------------------
    // Check product code conflict
    // ----------------------------------------------------------

    const duplicateCode =
      await Product.findOne({
        _id: {
          $ne: id,
        },
        companyId,
        productCode:
          product.productCode,
        deletedAt: null,
      })
        .select('_id')
        .lean();

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message:
          'Cannot restore product because the product code is already in use',
      });
    }

    // ----------------------------------------------------------
    // Check SKU conflict
    // ----------------------------------------------------------

    if (product.sku) {
      const duplicateSKU =
        await Product.findOne({
          _id: {
            $ne: id,
          },
          companyId,
          sku:
            product.sku,
          deletedAt: null,
        })
          .select('_id')
          .lean();

      if (duplicateSKU) {
        return res.status(409).json({
          success: false,
          message:
            'Cannot restore product because the SKU is already in use',
        });
      }
    }

    // ----------------------------------------------------------
    // Check barcode conflict
    // ----------------------------------------------------------

    if (product.barcode) {
      const duplicateBarcode =
        await Product.findOne({
          _id: {
            $ne: id,
          },
          companyId,
          barcode:
            product.barcode,
          deletedAt: null,
        })
          .select('_id')
          .lean();

      if (duplicateBarcode) {
        return res.status(409).json({
          success: false,
          message:
            'Cannot restore product because the barcode is already in use',
        });
      }
    }

    product.deletedAt =
      null;

    product.deletedBy =
      null;

    product.updatedBy =
      userId;

    await product.save();

    const restoredProduct =
      await populateProduct(
        Product.findOne({
          _id: product._id,
          companyId,
          deletedAt: null,
        })
      ).lean();

    return res.status(200).json({
      success: true,
      message:
        'Product restored successfully',
      data: restoredProduct,
    });
  } catch (error) {
    if (
      handleDuplicateKey(
        res,
        error
      )
    ) {
      return;
    }

    return sendError(
      res,
      error,
      'Unable to restore product'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  restoreProduct,
};