const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      trim: true,
      default: '',
    },
    line2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const quotationItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    productCode: {
      type: String,
      trim: true,
      default: '',
    },

    sku: {
      type: String,
      trim: true,
      default: '',
    },

    productName: {
      type: String,
      trim: true,
      required: true,
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

const quotationSchema = new mongoose.Schema(
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

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },

    quotationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },

    quotationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    validUntil: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'accepted',
        'rejected',
        'expired',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },

    items: {
      type: [quotationItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one quotation item is required',
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

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },

    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
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

    customerNotes: {
      type: String,
      trim: true,
      default: '',
    },

    sentAt: {
      type: Date,
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
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

    convertedToSalesOrder: {
      type: Boolean,
      default: false,
      index: true,
    },

    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
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

quotationSchema.index({
  companyId: 1,
  quotationNumber: 1,
});

quotationSchema.index({
  companyId: 1,
  status: 1,
});

quotationSchema.index({
  companyId: 1,
  customerId: 1,
});

quotationSchema.index({
  companyId: 1,
  quotationDate: -1,
});

quotationSchema.index({
  companyId: 1,
  deletedAt: 1,
});

quotationSchema.index(
  {
    companyId: 1,
    quotationNumber: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.models.Quotation ||
  mongoose.model('Quotation', quotationSchema);