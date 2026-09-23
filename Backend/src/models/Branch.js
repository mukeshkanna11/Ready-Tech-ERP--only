const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const branchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
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

    address: {
      type: addressSchema,
      default: () => ({}),
    },

    isHeadOffice: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Branch code must be unique inside one company.
branchSchema.index(
  { companyId: 1, code: 1 },
  { unique: true }
);

// One active/head-office record per company.
branchSchema.index(
  { companyId: 1, isHeadOffice: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isHeadOffice: true,
    },
  }
);

// Fast company branch listing.
branchSchema.index({
  companyId: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model('Branch', branchSchema);