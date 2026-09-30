const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    type: {
      type: String,
      required: true,
      enum: [
        "asset",
        "liability",
        "equity",
        "income",
        "expense",
      ],
      index: true,
    },

    subType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    parentAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },

    normalBalance: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    openingBalanceType: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit",
    },

    currentBalance: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "INR",
    },

    isSystemAccount: {
      type: Boolean,
      default: false,
      index: true,
    },

    isCashAccount: {
      type: Boolean,
      default: false,
    },

    isBankAccount: {
      type: Boolean,
      default: false,
    },

    isTaxAccount: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

accountSchema.index(
  { companyId: 1, code: 1 },
  { unique: true }
);

accountSchema.index(
  { companyId: 1, name: 1 }
);

accountSchema.index(
  { companyId: 1, type: 1, isActive: 1 }
);

accountSchema.index(
  { companyId: 1, deletedAt: 1 }
);

module.exports =
  mongoose.models.Account ||
  mongoose.model("Account", accountSchema);