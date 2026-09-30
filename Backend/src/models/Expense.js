const mongoose = require("mongoose");

const expenseItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    quantity: {
      type: Number,
      min: 0.01,
      default: 1,
    },

    unitPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed",
    },

    discountValue: {
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

    gstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    cgstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    sgstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    igstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    cgstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    sgstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    igstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalTax: {
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

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      trim: true,
      default: "",
    },

    line2: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    postalCode: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
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

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },

    expenseNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },

    subCategory: {
      type: String,
      trim: true,
      default: "",
    },

    expenseType: {
      type: String,
      enum: [
        "operational",
        "administrative",
        "travel",
        "salary",
        "rent",
        "utilities",
        "marketing",
        "office",
        "transport",
        "maintenance",
        "purchase",
        "other",
      ],
      default: "operational",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "paid",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "bank_transfer",
        "upi",
        "card",
        "cheque",
        "credit",
        "other",
      ],
      default: "cash",
    },

    currency: {
      type: String,
      trim: true,
      default: "INR",
    },

    placeOfSupply: {
      type: String,
      trim: true,
      default: "",
    },

    supplyType: {
      type: String,
      enum: ["intra_state", "inter_state"],
      default: "intra_state",
    },

    reverseCharge: {
      type: Boolean,
      default: false,
    },

    vendorSnapshot: {
      name: {
        type: String,
        trim: true,
        default: "",
      },

      companyName: {
        type: String,
        trim: true,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        default: "",
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },

      gstin: {
        type: String,
        trim: true,
        default: "",
      },

      billingAddress: {
        type: addressSchema,
        default: null,
      },

      shippingAddress: {
        type: addressSchema,
        default: null,
      },
    },

    billingAddress: {
      type: addressSchema,
      default: null,
    },

    shippingAddress: {
      type: addressSchema,
      default: null,
    },

    items: {
      type: [expenseItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "At least one expense item is required",
      },
    },

    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalDiscount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    cgstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    sgstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    igstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalTax: {
      type: Number,
      min: 0,
      default: 0,
    },

    shippingCharges: {
      type: Number,
      min: 0,
      default: 0,
    },

    otherCharges: {
      type: Number,
      min: 0,
      default: 0,
    },

    roundOff: {
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

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    termsAndConditions: {
      type: String,
      trim: true,
      default: "",
    },

    receiptUrl: {
      type: String,
      trim: true,
      default: "",
    },

    attachmentUrl: {
      type: String,
      trim: true,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    paidAt: {
      type: Date,
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

expenseSchema.index({
  companyId: 1,
  expenseNumber: 1,
});

expenseSchema.index({
  companyId: 1,
  expenseDate: -1,
});

expenseSchema.index({
  companyId: 1,
  status: 1,
});

expenseSchema.index({
  companyId: 1,
  paymentStatus: 1,
});

module.exports =
  mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);