const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      trim: true,
    },

    line2: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const companySchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // COMPANY INFORMATION
    // --------------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    legalName: {
      type: String,
      trim: true,
      maxlength: 200,
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

    website: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    registrationNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    gstNumber: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'INR',
      minlength: 3,
      maxlength: 3,
    },

    address: {
      type: addressSchema,
      default: () => ({}),
    },

    logo: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },

    // --------------------------------------------------
    // MULTI-TENANT / WORKSPACE
    // --------------------------------------------------

    /**
     * Workspace/tenant that owns this company.
     *
     * IMPORTANT:
     * req.companyId from JWT represents this workspace ID.
     *
     * One workspace can contain multiple companies:
     *
     * Workspace A
     *   ├── Company A
     *   ├── Company B
     *   └── Company C
     *
     * Workspace B
     *   ├── Company D
     *   └── Company E
     */
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    /**
     * User who created/onboarded the company.
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

// --------------------------------------------------
// INDEXES
// --------------------------------------------------

// Workspace company listing.
companySchema.index({
  workspaceId: 1,
  createdAt: -1,
});

// Workspace + status filtering.
companySchema.index({
  workspaceId: 1,
  status: 1,
});

// GST is globally unique when provided.
companySchema.index(
  {
    gstNumber: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

// Company -> Branch relationship.
companySchema.virtual('branches', {
  ref: 'Branch',
  localField: '_id',
  foreignField: 'companyId',
});

module.exports = mongoose.model('Company', companySchema);