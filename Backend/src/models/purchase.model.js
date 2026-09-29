const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    productCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    productName: {
      type: String,
      trim: true,
      default: '',
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },

    unit: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'PCS',
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    gstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    gstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },

    items: {
      type: [purchaseItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one purchase item is required',
      },
    },

    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    gstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    shippingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    otherCharges: {
      type: Number,
      min: 0,
      default: 0,
    },

    adjustmentAmount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: '',
    },

    termsAndConditions: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'confirmed',
        'received',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        'unpaid',
        'partial',
        'partially_paid',
        'paid',
      ],
      default: 'unpaid',
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

purchaseSchema.index(
  {
    companyId: 1,
    purchaseNumber: 1,
  },
  {
    unique: true,
  }
);

purchaseSchema.index({
  companyId: 1,
  status: 1,
  purchaseDate: -1,
});

purchaseSchema.index({
  companyId: 1,
  vendorId: 1,
  purchaseDate: -1,
});

purchaseSchema.index({
  companyId: 1,
  branchId: 1,
  status: 1,
  purchaseDate: -1,
});

purchaseSchema.index({
  companyId: 1,
  deletedAt: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.Purchase ||
  mongoose.model('Purchase', purchaseSchema);