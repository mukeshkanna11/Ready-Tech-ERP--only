const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    /*
     * Existing ERP tenant-isolation pattern.
     * companyId represents the authenticated workspace/company
     * available through req.companyId.
     */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    productCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: 100,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    displayName: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },

    productType: {
      type: String,
      enum: [
        'product',
        'service',
        'raw_material',
        'finished_good',
        'semi_finished',
        'consumable',
        'asset',
      ],
      default: 'product',
      index: true,
    },

    category: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },

    brand: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },

    unit: {
      type: String,
      trim: true,
      default: 'PCS',
      uppercase: true,
      maxlength: 30,
    },

    hsnSac: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: 30,
    },

    gstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    purchasePrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    sellingPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    mrp: {
      type: Number,
      min: 0,
      default: 0,
    },

    openingStock: {
      type: Number,
      min: 0,
      default: 0,
    },

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

    barcode: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 3000,
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
 * Product code must be unique inside a workspace.
 */
productSchema.index(
  {
    companyId: 1,
    productCode: 1,
  },
  {
    unique: true,
  }
);

/*
 * SKU is optional but must be unique when provided.
 */
productSchema.index(
  {
    companyId: 1,
    sku: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      sku: {
        $exists: true,
        $type: 'string',
        $ne: '',
      },
    },
  }
);

/*
 * Barcode is optional but must be unique when provided.
 */
productSchema.index(
  {
    companyId: 1,
    barcode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      barcode: {
        $exists: true,
        $type: 'string',
        $ne: '',
      },
    },
  }
);

productSchema.index({
  companyId: 1,
  status: 1,
  createdAt: -1,
});

productSchema.index({
  companyId: 1,
  branchId: 1,
  status: 1,
});

productSchema.index({
  companyId: 1,
  productType: 1,
  status: 1,
});

productSchema.index({
  companyId: 1,
  category: 1,
});

productSchema.index({
  companyId: 1,
  name: 1,
});

module.exports =
  mongoose.models.Product ||
  mongoose.model('Product', productSchema);