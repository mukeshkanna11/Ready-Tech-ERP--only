const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
      default: '',
    },

    addressLine2: {
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

    postalCode: {
      type: String,
      trim: true,
      default: '',
    },

    country: {
      type: String,
      trim: true,
      default: 'India',
    },
  },
  {
    _id: false,
  }
);

const contactPersonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },

    designation: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  }
);

const vendorSchema = new mongoose.Schema(
  {
    /*
     * IMPORTANT
     * companyId represents the authenticated workspace/company
     * identifier available through req.companyId.
     *
     * This follows the existing ERP tenant-isolation pattern.
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

    vendorCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    displayName: {
      type: String,
      trim: true,
      default: '',
    },

    vendorType: {
      type: String,
      enum: ['individual', 'business'],
      default: 'business',
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },

    website: {
      type: String,
      trim: true,
      default: '',
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    taxNumber: {
      type: String,
      trim: true,
      default: '',
    },

    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    paymentTerms: {
      type: String,
      trim: true,
      default: '',
    },

    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    contactPerson: {
      type: contactPersonSchema,
      default: () => ({}),
    },

    notes: {
      type: String,
      trim: true,
      default: '',
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
 * Vendor code must be unique inside a workspace.
 */
vendorSchema.index(
  {
    companyId: 1,
    vendorCode: 1,
  },
  {
    unique: true,
  }
);

/*
 * GST number should be unique inside a workspace.
 * Sparse/partial indexing allows vendors without GST numbers.
 */
vendorSchema.index(
  {
    companyId: 1,
    gstNumber: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      gstNumber: {
        $exists: true,
        $type: 'string',
        $ne: '',
      },
    },
  }
);

vendorSchema.index({
  companyId: 1,
  status: 1,
  createdAt: -1,
});

vendorSchema.index({
  companyId: 1,
  branchId: 1,
  status: 1,
});

vendorSchema.index({
  companyId: 1,
  name: 1,
});

module.exports = mongoose.model('Vendor', vendorSchema);