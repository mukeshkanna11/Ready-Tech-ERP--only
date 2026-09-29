const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    /*
     * req.companyId from the authenticated JWT.
     * This is the ERP workspace/company isolation key.
     */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    /*
     * Physical branch/location where this stock belongs.
     * null = workspace-level / common stock.
     */
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    /*
     * Product master reference.
     */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    /*
     * Physical quantity currently available in stock.
     */
    openingStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    onHand: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
     * Quantity reserved for future sales/orders.
     */
    reserved: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
     * Cached available quantity.
     *
     * available = onHand - reserved
     */
    available: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
     * Optional inventory valuation information.
     */
    averageCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastPurchasePrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastStockInAt: {
      type: Date,
      default: null,
    },

    lastStockOutAt: {
      type: Date,
      default: null,
    },

    /*
     * Inventory-specific thresholds.
     * If not supplied, these can be inherited from Product.
     */
    reorderLevel: {
      type: Number,
      min: 0,
      default: 0,
    },

    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    maximumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One inventory record per:
 *
 * workspace + product + branch
 *
 * For branch stock, branchId is included.
 */
inventorySchema.index(
  {
    companyId: 1,
    productId: 1,
    branchId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      branchId: {
        $type: 'objectId',
      },
      deletedAt: null,
    },
  }
);

/*
 * Workspace-level stock where branchId is null.
 *
 * This prevents multiple common-stock records for
 * the same product.
 */
inventorySchema.index(
  {
    companyId: 1,
    productId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      branchId: null,
      deletedAt: null,
    },
  }
);

inventorySchema.index({
  companyId: 1,
  branchId: 1,
  status: 1,
  createdAt: -1,
});

inventorySchema.index({
  companyId: 1,
  productId: 1,
  status: 1,
});

inventorySchema.index({
  companyId: 1,
  onHand: 1,
});

inventorySchema.index({
  companyId: 1,
  available: 1,
});

module.exports = mongoose.model('Inventory', inventorySchema);