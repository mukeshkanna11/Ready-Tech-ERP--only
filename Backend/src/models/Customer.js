const mongoose = require('mongoose');

// --------------------------------------------------
// ADDRESS SCHEMA
// --------------------------------------------------

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    line2: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    state: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    country: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },
  },
  {
    _id: false,
  }
);

// --------------------------------------------------
// CONTACT PERSON SCHEMA
// --------------------------------------------------

const contactPersonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    designation: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  {
    _id: false,
  }
);

// --------------------------------------------------
// CUSTOMER SCHEMA
// --------------------------------------------------

const customerSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // TENANT / WORKSPACE
    // --------------------------------------------------

    // NOTE:
    // Existing ERP architecture currently stores the
    // workspace ID in Customer.companyId.
    // Do not change this without a data migration.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    // --------------------------------------------------
    // CUSTOMER INFORMATION
    // --------------------------------------------------

    customerCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    customerType: {
      type: String,
      enum: ['individual', 'business'],
      default: 'business',
      index: true,
    },

    // --------------------------------------------------
    // CONTACT INFORMATION
    // --------------------------------------------------

    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    alternatePhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    website: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // --------------------------------------------------
    // TAX INFORMATION
    // --------------------------------------------------

    gstNumber: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },

    taxNumber: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },

    // --------------------------------------------------
    // ADDRESSES
    // --------------------------------------------------

    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    // --------------------------------------------------
    // CONTACT PERSON
    // --------------------------------------------------

    contactPerson: {
      type: contactPersonSchema,
      default: () => ({}),
    },

    // --------------------------------------------------
    // COMMERCIAL INFORMATION
    // --------------------------------------------------

    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    paymentTerms: {
      type: Number,
      min: 0,
      default: 0,
    },

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // --------------------------------------------------
    // AUDIT
    // --------------------------------------------------

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------
// INDEXES
// --------------------------------------------------

// Customer code must be unique inside a workspace.
customerSchema.index(
  {
    companyId: 1,
    customerCode: 1,
  },
  {
    unique: true,
  }
);

// Faster company customer listing.
customerSchema.index({
  companyId: 1,
  createdAt: -1,
});

// Faster company + status filtering.
customerSchema.index({
  companyId: 1,
  status: 1,
});

// Faster company + branch filtering.
customerSchema.index({
  companyId: 1,
  branchId: 1,
});

// Faster customer search.
customerSchema.index({
  companyId: 1,
  name: 1,
});

// --------------------------------------------------
// GST UNIQUE INDEX
// --------------------------------------------------

// GST must be unique inside the same workspace,
// but empty/missing GST values are allowed.
//
// IMPORTANT:
// This is the ONLY GST index.
// Do not add another sparse GST index below.
customerSchema.index(
  {
    companyId: 1,
    gstNumber: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      gstNumber: {
        $type: 'string',
        $ne: '',
      },
    },
  }
);

module.exports =
  mongoose.model('Customer', customerSchema);