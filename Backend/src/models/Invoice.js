const mongoose = require("mongoose");

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
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
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
  },
  { _id: false }
);

const invoiceItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productCode: {
      type: String,
      trim: true,
      default: "",
    },

    sku: {
      type: String,
      trim: true,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    hsnSac: {
      type: String,
      trim: true,
      default: "",
    },

    unit: {
      type: String,
      trim: true,
      default: "PCS",
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    grossAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
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

const invoiceSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    salesId: {
      type: Schema.Types.ObjectId,
      ref: "Sales",
      default: null,
      index: true,
    },

    salesOrderId: {
      type: Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
      index: true,
    },

    quotationId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
      index: true,
    },

    invoiceNumber: {
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

    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "partial",
        "paid",
        "refunded",
      ],
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
      default: "credit",
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    companySnapshot: {
      name: {
        type: String,
        trim: true,
        default: "",
      },

      legalName: {
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

      website: {
        type: String,
        trim: true,
        default: "",
      },

      registrationNumber: {
        type: String,
        trim: true,
        default: "",
      },

      gstin: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      logo: {
        type: String,
        trim: true,
        default: "",
      },

      address: {
        type: addressSchema,
        default: () => ({}),
      },
    },

    customerSnapshot: {
      name: {
        type: String,
        required: true,
        trim: true,
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
        uppercase: true,
        default: "",
      },

      billingAddress: {
        type: addressSchema,
        default: () => ({}),
      },

      shippingAddress: {
        type: addressSchema,
        default: () => ({}),
      },
    },

    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    placeOfSupply: {
      type: String,
      trim: true,
      default: "",
    },

    supplyType: {
      type: String,
      enum: ["intra_state", "inter_state", "export", "other"],
      default: "intra_state",
    },

    reverseCharge: {
      type: Boolean,
      default: false,
    },

    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Invoice must contain at least one item",
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

    customerNotes: {
      type: String,
      trim: true,
      default: "",
    },

    amountInWords: {
      type: String,
      trim: true,
      default: "",
    },

    issuedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledReason: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({
  companyId: 1,
  invoiceNumber: 1,
});

invoiceSchema.index({
  companyId: 1,
  customerId: 1,
  invoiceDate: -1,
});

invoiceSchema.index({
  companyId: 1,
  status: 1,
});

module.exports =
  mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);