const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },

    paymentNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "bank_transfer",
        "upi",
        "card",
        "cheque",
        "other",
      ],
      default: "cash",
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "completed",
        "cancelled",
        "refunded",
      ],
      default: "completed",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
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
      default: "",
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    refundReason: {
      type: String,
      trim: true,
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
  }
);

paymentSchema.index({
  companyId: 1,
  paymentNumber: 1,
});

paymentSchema.index({
  companyId: 1,
  invoiceId: 1,
});

paymentSchema.index({
  companyId: 1,
  customerId: 1,
});

module.exports =
  mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);