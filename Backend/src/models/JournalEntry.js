const mongoose = require("mongoose");

const journalLineSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    credit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const journalEntrySchema = new mongoose.Schema(
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

    journalNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    journalDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    entryType: {
      type: String,
      enum: [
        "general",
        "sales",
        "purchase",
        "payment",
        "receipt",
        "expense",
        "invoice",
        "adjustment",
        "opening",
        "closing",
        "transfer",
        "tax",
        "payroll",
        "other",
      ],
      default: "general",
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "posted", "cancelled"],
      default: "draft",
      index: true,
    },

    lines: {
      type: [journalLineSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: "Journal entry must contain at least two lines",
      },
    },

    totalDebit: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCredit: {
      type: Number,
      default: 0,
      min: 0,
    },

    difference: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    postedAt: {
      type: Date,
      default: null,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
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

journalEntrySchema.index(
  { companyId: 1, journalNumber: 1 },
  { unique: true }
);

journalEntrySchema.index({
  companyId: 1,
  journalDate: -1,
});

journalEntrySchema.index({
  companyId: 1,
  status: 1,
});

journalEntrySchema.index({
  companyId: 1,
  entryType: 1,
});

module.exports =
  mongoose.models.JournalEntry ||
  mongoose.model("JournalEntry", journalEntrySchema);