const mongoose = require('mongoose');

const salesItemSchema = new mongoose.Schema(
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

    sku: {
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

    taxPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    lineTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: true }
);

const salesSchema = new mongoose.Schema(
  {
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

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },

    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ['draft', 'confirmed', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },

    paymentMethod: {
      type: String,
      trim: true,
      default: '',
    },

    items: {
      type: [salesItemSchema],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message: 'At least one sales item is required',
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

    taxAmount: {
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

    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    balanceAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },

    billingAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    shippingAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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

    stockUpdated: {
      type: Boolean,
      default: false,
      index: true,
    },

    stockUpdatedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

salesSchema.index(
  {
    companyId: 1,
    invoiceNumber: 1,
  },
  {
    unique: true,
  }
);

salesSchema.index({
  companyId: 1,
  status: 1,
  saleDate: -1,
});

salesSchema.index({
  companyId: 1,
  customerId: 1,
  saleDate: -1,
});

salesSchema.index({
  companyId: 1,
  branchId: 1,
  status: 1,
  saleDate: -1,
});

salesSchema.index({
  companyId: 1,
  deletedAt: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.Sales ||
  mongoose.model('Sales', salesSchema);