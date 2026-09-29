const mongoose = require('mongoose');

const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
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

const normalizeString = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
};

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
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

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    const error = new Error(
      `${fieldName} must be a valid non-negative number`
    );

    error.statusCode = 400;
    throw error;
  }

  return number;
};

const parsePositiveNumber = (
  value,
  fieldName
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    const error = new Error(
      `${fieldName} must be greater than 0`
    );

    error.statusCode = 400;
    throw error;
  }

  return number;
};

const sendError = (
  res,
  error,
  fallback
) => {
  console.error(
    'Inventory controller error:',
    error
  );

  return res.status(
    error?.statusCode || 500
  ).json({
    success: false,
    message:
      error?.message || fallback,
  });
};

// ============================================================
// VALIDATE BRANCH
// ============================================================

const validateBranchForWorkspace = async (
  branchId,
  workspaceId,
  session = null
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

  let query = Branch.findById(branchId)
    .select(
      '_id companyId name code status isHeadOffice'
    );

  if (session) {
    query = query.session(session);
  }

  const branch = await query.lean();

  if (!branch) {
    const error = new Error(
      'Branch not found'
    );

    error.statusCode = 400;
    throw error;
  }

  let companyQuery = Company.findOne({
    _id: branch.companyId,
    workspaceId,
  }).select('_id status');

  if (session) {
    companyQuery =
      companyQuery.session(session);
  }

  const company =
    await companyQuery.lean();

  if (!company) {
    const error = new Error(
      'Branch does not belong to your workspace'
    );

    error.statusCode = 400;
    throw error;
  }

  return branch;
};

// ============================================================
// GET PRODUCT
// ============================================================

const getProductForWorkspace = async (
  productId,
  workspaceId,
  session = null
) => {
  if (!isValidObjectId(productId)) {
    const error = new Error(
      'Invalid product ID'
    );

    error.statusCode = 400;
    throw error;
  }

  let query = Product.findOne({
    _id: productId,
    companyId: workspaceId,
    deletedAt: null,
  }).select(
    '_id companyId branchId productCode sku name displayName productType category brand unit purchasePrice sellingPrice mrp openingStock reorderLevel minimumStock maximumStock status'
  );

  if (session) {
    query = query.session(session);
  }

  const product = await query.lean();

  if (!product) {
    const error = new Error(
      'Product not found'
    );

    error.statusCode = 404;
    throw error;
  }

  return product;
};

// ============================================================
// POPULATE INVENTORY
// ============================================================

const populateInventory = (query) => {
  return query
    .populate({
      path: 'productId',
      select:
        '_id productCode sku name displayName productType category brand unit purchasePrice sellingPrice mrp reorderLevel minimumStock maximumStock status',
    })
    .populate({
      path: 'branchId',
      select:
        '_id name code status isHeadOffice',
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

// ============================================================
// CALCULATE STOCK STATUS
// ============================================================

const getStockStatus = (
  inventory
) => {
  const available =
    Number(inventory.available || 0);

  const reorderLevel =
    Number(inventory.reorderLevel || 0);

  const minimumStock =
    Number(inventory.minimumStock || 0);

  if (available <= 0) {
    return 'out_of_stock';
  }

  if (
    reorderLevel > 0 &&
    available <= reorderLevel
  ) {
    return 'low_stock';
  }

  if (
    minimumStock > 0 &&
    available <= minimumStock
  ) {
    return 'low_stock';
  }

  return 'in_stock';
};

// ============================================================
// CREATE / INITIALIZE INVENTORY
// ============================================================

const createInventory = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const {
      productId,
      branchId,
      openingStock,
      reorderLevel,
      minimumStock,
      maximumStock,
      averageCost,
      lastPurchasePrice,
    } = req.body || {};

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          'Product is required',
      });
    }

    await session.withTransaction(
      async () => {
        const product =
          await getProductForWorkspace(
            productId,
            workspaceId,
            session
          );

        await validateBranchForWorkspace(
          branchId,
          workspaceId,
          session
        );

        const existing =
          await Inventory.findOne({
            companyId: workspaceId,
            productId,
            branchId:
              branchId || null,
            deletedAt: null,
          })
            .session(session)
            .lean();

        if (existing) {
          const error = new Error(
            'Inventory already exists for this product and branch'
          );

          error.statusCode = 409;
          throw error;
        }

        const finalOpeningStock =
          openingStock === undefined
            ? Number(
                product.openingStock || 0
              )
            : parseNonNegativeNumber(
                openingStock,
                'Opening stock'
              );

        const finalReorderLevel =
          reorderLevel === undefined
            ? Number(
                product.reorderLevel || 0
              )
            : parseNonNegativeNumber(
                reorderLevel,
                'Reorder level'
              );

        const finalMinimumStock =
          minimumStock === undefined
            ? Number(
                product.minimumStock || 0
              )
            : parseNonNegativeNumber(
                minimumStock,
                'Minimum stock'
              );

        const finalMaximumStock =
          maximumStock === undefined
            ? Number(
                product.maximumStock || 0
              )
            : parseNonNegativeNumber(
                maximumStock,
                'Maximum stock'
              );

        if (
          finalMaximumStock > 0 &&
          finalMinimumStock >
            finalMaximumStock
        ) {
          const error = new Error(
            'Minimum stock cannot be greater than maximum stock'
          );

          error.statusCode = 400;
          throw error;
        }

        const inventory =
          await Inventory.create(
            [
              {
                companyId:
                  workspaceId,

                branchId:
                  branchId || null,

                productId:
                  product._id,

                openingStock:
                  finalOpeningStock,

                onHand:
                  finalOpeningStock,

                reserved: 0,

                available:
                  finalOpeningStock,

                averageCost:
                  parseNonNegativeNumber(
                    averageCost,
                    'Average cost'
                  ),

                lastPurchasePrice:
                  parseNonNegativeNumber(
                    lastPurchasePrice,
                    'Last purchase price'
                  ),

                reorderLevel:
                  finalReorderLevel,

                minimumStock:
                  finalMinimumStock,

                maximumStock:
                  finalMaximumStock,

                status: 'active',

                createdBy:
                  userId,

                updatedBy:
                  userId,
              },
            ],
            { session }
          );

        if (finalOpeningStock > 0) {
          await StockMovement.create(
            [
              {
                companyId:
                  workspaceId,

                branchId:
                  branchId || null,

                inventoryId:
                  inventory[0]._id,

                productId:
                  product._id,

                movementType:
                  'opening',

                direction:
                  'in',

                quantity:
                  finalOpeningStock,

                previousQuantity: 0,

                newQuantity:
                  finalOpeningStock,

                previousReserved: 0,

                newReserved: 0,

                unitCost:
                  Number(
                    averageCost ||
                      product.purchasePrice ||
                      0
                  ),

                referenceType:
                  'opening_stock',

                reason:
                  'Initial inventory',

                performedBy:
                  userId,
              },
            ],
            { session }
          );
        }

        const populated =
          await populateInventory(
            Inventory.findById(
              inventory[0]._id
            ).session(session)
          ).lean();

        res.status(201).json({
          success: true,
          message:
            'Inventory created successfully',
          data: populated,
        });
      }
    );
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to create inventory'
    );
  } finally {
    await session.endSession();
  }
};

// ============================================================
// LIST INVENTORY
// ============================================================

const getInventory = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

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

    const branchId =
      normalizeString(
        req.query.branchId
      );

    const productId =
      normalizeString(
        req.query.productId
      );

    const status =
      normalizeString(
        req.query.status
      ).toLowerCase();

    const stockStatus =
      normalizeString(
        req.query.stockStatus
      ).toLowerCase();

    const filter = {
      companyId:
        workspaceId,

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

    if (branchId) {
      if (
        !isValidObjectId(branchId)
      ) {
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

      filter.branchId =
        branchId;
    }

    if (productId) {
      if (
        !isValidObjectId(productId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid product ID',
        });
      }

      filter.productId =
        productId;
    }

    /*
     * Stock status is calculated from quantities.
     */
    if (
      stockStatus ===
      'out_of_stock'
    ) {
      filter.available = {
        $lte: 0,
      };
    }

    if (
      stockStatus ===
      'low_stock'
    ) {
      filter.$expr = {
        $and: [
          {
            $gt: [
              '$available',
              0,
            ],
          },
          {
            $or: [
              {
                $and: [
                  {
                    $gt: [
                      '$reorderLevel',
                      0,
                    ],
                  },
                  {
                    $lte: [
                      '$available',
                      '$reorderLevel',
                    ],
                  },
                ],
              },
              {
                $and: [
                  {
                    $gt: [
                      '$minimumStock',
                      0,
                    ],
                  },
                  {
                    $lte: [
                      '$available',
                      '$minimumStock',
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
    }

    if (
      stockStatus ===
      'in_stock'
    ) {
      filter.available = {
        $gt: 0,
      };
    }

    if (search) {
      const regex =
        new RegExp(
          escapeRegex(search),
          'i'
        );

      const matchingProducts =
        await Product.find({
          companyId:
            workspaceId,

          deletedAt: null,

          $or: [
            {
              productCode:
                regex,
            },
            {
              sku: regex,
            },
            {
              name: regex,
            },
            {
              displayName:
                regex,
            },
            {
              category:
                regex,
            },
            {
              brand:
                regex,
            },
            {
              barcode:
                regex,
            },
          ],
        })
          .select('_id')
          .lean();

      const productIds =
        matchingProducts.map(
          (product) =>
            product._id
        );

      filter.productId = {
        $in: productIds,
      };
    }

    const [
      inventory,
      total,
    ] = await Promise.all([
      populateInventory(
        Inventory.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
      ).lean(),

      Inventory.countDocuments(
        filter
      ),
    ]);

    const data =
      inventory.map(
        (item) => ({
          ...item,
          stockStatus:
            getStockStatus(item),
        })
      );

    const totalPages =
      Math.ceil(
        total / limit
      );

    return res.status(200).json({
      success: true,
      data,
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
      'Unable to fetch inventory'
    );
  }
};

// ============================================================
// GET INVENTORY BY ID
// ============================================================

const getInventoryById = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory ID',
      });
    }

    const inventory =
      await populateInventory(
        Inventory.findOne({
          _id: id,
          companyId:
            workspaceId,
          deletedAt: null,
        })
      ).lean();

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message:
          'Inventory not found',
      });
    }

    const movements =
      await StockMovement.find({
        companyId:
          workspaceId,
        inventoryId:
          inventory._id,
      })
        .populate({
          path: 'performedBy',
          select:
            '_id name email',
        })
        .sort({
          movementDate: -1,
          createdAt: -1,
        })
        .limit(100)
        .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...inventory,
        stockStatus:
          getStockStatus(
            inventory
          ),
        movements,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to fetch inventory'
    );
  }
};

// ============================================================
// UPDATE INVENTORY SETTINGS
// ============================================================

const updateInventory = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory ID',
      });
    }

    const inventory =
      await Inventory.findOne({
        _id: id,
        companyId:
          workspaceId,
        deletedAt: null,
      });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message:
          'Inventory not found',
      });
    }

    const body =
      req.body || {};

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'reorderLevel'
      )
    ) {
      inventory.reorderLevel =
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
      inventory.minimumStock =
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
      inventory.maximumStock =
        parseNonNegativeNumber(
          body.maximumStock,
          'Maximum stock'
        );
    }

    if (
      inventory.maximumStock > 0 &&
      inventory.minimumStock >
        inventory.maximumStock
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Minimum stock cannot be greater than maximum stock',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'averageCost'
      )
    ) {
      inventory.averageCost =
        parseNonNegativeNumber(
          body.averageCost,
          'Average cost'
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'lastPurchasePrice'
      )
    ) {
      inventory.lastPurchasePrice =
        parseNonNegativeNumber(
          body.lastPurchasePrice,
          'Last purchase price'
        );
    }

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

      inventory.status =
        status;
    }

    inventory.updatedBy =
      userId;

    await inventory.save();

    const updated =
      await populateInventory(
        Inventory.findOne({
          _id:
            inventory._id,
          companyId:
            workspaceId,
          deletedAt: null,
        })
      ).lean();

    return res.status(200).json({
      success: true,
      message:
        'Inventory updated successfully',
      data: {
        ...updated,
        stockStatus:
          getStockStatus(updated),
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to update inventory'
    );
  }
};

// ============================================================
// STOCK ADJUSTMENT
// ============================================================

const adjustStock = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const {
      inventoryId,
      quantity,
      direction,
      reason,
      notes,
      referenceType,
      referenceNumber,
      unitCost,
      movementDate,
    } = req.body || {};

    if (!inventoryId) {
      return res.status(400).json({
        success: false,
        message:
          'Inventory ID is required',
      });
    }

    if (
      !isValidObjectId(
        inventoryId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory ID',
      });
    }

    const finalQuantity =
      parsePositiveNumber(
        quantity,
        'Quantity'
      );

    const finalDirection =
      normalizeString(
        direction
      ).toLowerCase();

    if (
      !['in', 'out'].includes(
        finalDirection
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Direction must be in or out',
      });
    }

    await session.withTransaction(
      async () => {
        const inventory =
          await Inventory.findOne({
            _id:
              inventoryId,
            companyId:
              workspaceId,
            deletedAt: null,
          }).session(session);

        if (!inventory) {
          const error = new Error(
            'Inventory not found'
          );

          error.statusCode = 404;
          throw error;
        }

        const previousQuantity =
          Number(
            inventory.onHand || 0
          );

        const previousReserved =
          Number(
            inventory.reserved || 0
          );

        let newQuantity =
          previousQuantity;

        if (
          finalDirection === 'in'
        ) {
          newQuantity =
            previousQuantity +
            finalQuantity;
        } else {
          newQuantity =
            previousQuantity -
            finalQuantity;
        }

        /*
         * Never allow physical stock to go negative.
         */
        if (
          newQuantity < 0
        ) {
          const error = new Error(
            'Insufficient stock. Stock cannot become negative.'
          );

          error.statusCode = 400;
          throw error;
        }

        /*
         * Reserved stock can never exceed on-hand stock.
         */
        if (
          previousReserved >
          newQuantity
        ) {
          const error = new Error(
            'Adjustment would make reserved stock greater than available stock'
          );

          error.statusCode = 400;
          throw error;
        }

        inventory.onHand =
          newQuantity;

        inventory.available =
          newQuantity -
          previousReserved;

        if (
          finalDirection ===
          'in'
        ) {
          inventory.lastStockInAt =
            new Date();
        } else {
          inventory.lastStockOutAt =
            new Date();
        }

        if (
          unitCost !==
          undefined
        ) {
          inventory.averageCost =
            parseNonNegativeNumber(
              unitCost,
              'Unit cost'
            );
        }

        inventory.updatedBy =
          userId;

        await inventory.save({
          session,
        });

        await StockMovement.create(
          [
            {
              companyId:
                workspaceId,

              branchId:
                inventory.branchId,

              inventoryId:
                inventory._id,

              productId:
                inventory.productId,

              movementType:
                finalDirection ===
                'in'
                  ? 'adjustment_in'
                  : 'adjustment_out',

              direction:
                finalDirection,

              quantity:
                finalQuantity,

              previousQuantity,

              newQuantity,

              previousReserved,

              newReserved:
                previousReserved,

              unitCost:
                Number(
                  unitCost || 0
                ),

              referenceType:
                normalizeString(
                  referenceType
                ),

              referenceNumber:
                normalizeString(
                  referenceNumber
                ),

              reason:
                normalizeString(
                  reason
                ),

              notes:
                normalizeString(
                  notes
                ),

              performedBy:
                userId,

              movementDate:
                movementDate
                  ? new Date(
                      movementDate
                    )
                  : new Date(),
            },
          ],
          { session }
        );

        const updated =
          await populateInventory(
            Inventory.findById(
              inventory._id
            ).session(session)
          ).lean();

        res.status(200).json({
          success: true,
          message:
            'Stock adjusted successfully',
          data: {
            ...updated,
            stockStatus:
              getStockStatus(
                updated
              ),
          },
        });
      }
    );
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to adjust stock'
    );
  } finally {
    await session.endSession();
  }
};

// ============================================================
// STOCK MOVEMENTS
// ============================================================

const getStockMovements = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const inventoryId =
      normalizeString(
        req.query.inventoryId
      );

    const productId =
      normalizeString(
        req.query.productId
      );

    const branchId =
      normalizeString(
        req.query.branchId
      );

    const movementType =
      normalizeString(
        req.query.movementType
      ).toLowerCase();

    const direction =
      normalizeString(
        req.query.direction
      ).toLowerCase();

    const filter = {
      companyId:
        workspaceId,
    };

    if (inventoryId) {
      if (
        !isValidObjectId(
          inventoryId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid inventory ID',
        });
      }

      filter.inventoryId =
        inventoryId;
    }

    if (productId) {
      if (
        !isValidObjectId(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid product ID',
        });
      }

      filter.productId =
        productId;
    }

    if (branchId) {
      if (
        !isValidObjectId(
          branchId
        )
      ) {
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

      filter.branchId =
        branchId;
    }

    const allowedMovementTypes = [
      'opening',
      'purchase',
      'purchase_return',
      'sale',
      'sales_return',
      'adjustment_in',
      'adjustment_out',
      'transfer_in',
      'transfer_out',
      'reservation',
      'release',
    ];

    if (
      movementType &&
      allowedMovementTypes.includes(
        movementType
      )
    ) {
      filter.movementType =
        movementType;
    }

    if (
      direction &&
      ['in', 'out', 'neutral'].includes(
        direction
      )
    ) {
      filter.direction =
        direction;
    }

    const [
      movements,
      total,
    ] = await Promise.all([
      StockMovement.find(filter)
        .populate({
          path: 'productId',
          select:
            '_id productCode sku name unit',
        })
        .populate({
          path: 'branchId',
          select:
            '_id name code',
        })
        .populate({
          path: 'performedBy',
          select:
            '_id name email',
        })
        .sort({
          movementDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      StockMovement.countDocuments(
        filter
      ),
    ]);

    const totalPages =
      Math.ceil(
        total / limit
      );

    return res.status(200).json({
      success: true,
      data: movements,
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
      'Unable to fetch stock movements'
    );
  }
};

// ============================================================
// DELETE / DEACTIVATE INVENTORY
// ============================================================

const deleteInventory = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory ID',
      });
    }

    const inventory =
      await Inventory.findOne({
        _id: id,
        companyId:
          workspaceId,
        deletedAt: null,
      });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message:
          'Inventory not found',
      });
    }

    /*
     * Inventory with stock should never be
     * silently deleted.
     */
    if (
      Number(inventory.onHand || 0) >
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Inventory with available stock cannot be deleted. Adjust the stock to zero first.',
      });
    }

    if (
      Number(inventory.reserved || 0) >
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Inventory with reserved stock cannot be deleted.',
      });
    }

    inventory.deletedAt =
      new Date();

    inventory.deletedBy =
      userId;

    inventory.updatedBy =
      userId;

    inventory.status =
      'inactive';

    await inventory.save();

    return res.status(200).json({
      success: true,
      message:
        'Inventory deleted successfully',
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to delete inventory'
    );
  }
};

// ============================================================
// RESTORE INVENTORY
// ============================================================

const restoreInventory = async (
  req,
  res
) => {
  try {
    const workspaceId =
      getWorkspaceId(req);

    const userId =
      req.userId || null;

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory ID',
      });
    }

    const inventory =
      await Inventory.findOne({
        _id: id,
        companyId:
          workspaceId,
        deletedAt: {
          $ne: null,
        },
      });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message:
          'Deleted inventory not found',
      });
    }

    const duplicate =
      await Inventory.findOne({
        _id: {
          $ne: id,
        },
        companyId:
          workspaceId,
        productId:
          inventory.productId,
        branchId:
          inventory.branchId,
        deletedAt: null,
      })
        .select('_id')
        .lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          'Cannot restore inventory because an active inventory record already exists for this product and branch',
      });
    }

    inventory.deletedAt =
      null;

    inventory.deletedBy =
      null;

    inventory.status =
      'active';

    inventory.updatedBy =
      userId;

    await inventory.save();

    const restored =
      await populateInventory(
        Inventory.findOne({
          _id:
            inventory._id,
          companyId:
            workspaceId,
          deletedAt: null,
        })
      ).lean();

    return res.status(200).json({
      success: true,
      message:
        'Inventory restored successfully',
      data: {
        ...restored,
        stockStatus:
          getStockStatus(
            restored
          ),
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to restore inventory'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createInventory,
  getInventory,
  getInventoryById,
  updateInventory,
  adjustStock,
  getStockMovements,
  deleteInventory,
  restoreInventory,
};