const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const Customer = require("../models/Customer");
const Product = require("../models/Product");

const {
  generateInvoicePdf,
  amountInWords,
} = require("../services/invoicePdf.service");

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const SUPPLY_TYPES = [
  "intra_state",
  "inter_state",
  "export",
  "other",
];

// Supply types taxed as IGST. All others split into CGST + SGST.
const IGST_SUPPLY_TYPES = [
  "inter_state",
  "export",
];

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeState = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

// First 2 digits of a GSTIN (or a "29-Karnataka" style place of supply)
// are the GST state code.
const getStateCode = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^(\d{2})/);

  return match ? match[1] : "";
};

const isSameState = (placeOfSupply, company = {}) => {
  const supplyCode = getStateCode(placeOfSupply);
  const companyCode = getStateCode(company.gstin);

  if (supplyCode && companyCode) {
    return supplyCode === companyCode;
  }

  const supplyState = normalizeState(
    String(placeOfSupply || "").replace(/^\d{2}\s*-?\s*/, "")
  );
  const companyState = normalizeState(company.address?.state);

  if (supplyState && companyState) {
    return supplyState === companyState;
  }

  return null;
};

const getDefaultPlaceOfSupply = (customerSnapshot = {}, shippingAddress = {}, billingAddress = {}) =>
  shippingAddress.state ||
  billingAddress.state ||
  customerSnapshot.shippingAddress?.state ||
  customerSnapshot.billingAddress?.state ||
  "";

/*
 * Supply type must be known BEFORE GST is calculated.
 * Explicit value wins; otherwise derive it from place of supply
 * vs company state, then GSTIN state codes, then country.
 */
const resolveSupplyType = ({
  requested,
  companySnapshot = {},
  customerSnapshot = {},
  placeOfSupply,
  shippingAddress = {},
  billingAddress = {},
  fallback = "intra_state",
}) => {
  if (
    requested !== undefined &&
    requested !== null &&
    requested !== ""
  ) {
    if (!SUPPLY_TYPES.includes(requested)) {
      throw badRequest(
        `Invalid supplyType. Allowed: ${SUPPLY_TYPES.join(", ")}`
      );
    }

    return requested;
  }

  const country =
    shippingAddress.country ||
    billingAddress.country ||
    "";

  if (
    country &&
    normalizeState(country) !== "india"
  ) {
    return "export";
  }

  const samePlace = isSameState(
    placeOfSupply,
    companySnapshot
  );

  if (samePlace !== null) {
    return samePlace ? "intra_state" : "inter_state";
  }

  const companyCode = getStateCode(companySnapshot.gstin);
  const customerCode = getStateCode(customerSnapshot.gstin);

  if (companyCode && customerCode) {
    return companyCode === customerCode
      ? "intra_state"
      : "inter_state";
  }

  return SUPPLY_TYPES.includes(fallback)
    ? fallback
    : "intra_state";
};

const parseCharge = (value, label) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) {
    throw badRequest(`${label} cannot be negative`);
  }

  return round2(amount);
};

const getCompany = async (req) => {
  if (!req.companyId) {
    return null;
  }

  return Company.findOne({
    workspaceId: req.companyId,
    status: "active",
  })
    .select(
      "_id workspaceId name legalName email phone website registrationNumber gstNumber gstin currency logo address"
    )
    .lean();
};

const normalizeGstin = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeAddress = (address = {}) => ({
  name: address.name || "",
  line1: address.line1 || "",
  line2: address.line2 || "",
  city: address.city || "",
  state: address.state || "",
  country: address.country || "India",
  postalCode: address.postalCode || "",
  gstin: normalizeGstin(address.gstin),
});

const getCompanyGstin = (company) =>
  normalizeGstin(company.gstin || company.gstNumber);

const getCustomerFromPayload = async (payload, workspaceId) => {
  if (!workspaceId) {
    throw new Error("Company workspace is required");
  }

  if (payload.customerId) {
    if (!mongoose.Types.ObjectId.isValid(payload.customerId)) {
      throw new Error("Invalid customer ID");
    }

    const customer = await Customer.findOne({
      _id: payload.customerId,
      companyId: workspaceId,
      status: "active",
      deletedAt: null,
    }).lean();

    if (!customer) {
      throw new Error("Customer not found in your company");
    }

    const billingAddress = customer.billingAddress || {};
    const shippingAddress = customer.shippingAddress || {};

    return {
      customer,
      customerId: customer._id,
      newCustomer: null,

      snapshot: {
        name:
          customer.name ||
          customer.displayName ||
          customer.companyName ||
          "",

        companyName:
          customer.companyName ||
          customer.displayName ||
          customer.name ||
          "",

        email: customer.email || "",
        phone: customer.phone || "",

        gstin:
          customer.gstin ||
          customer.gstNumber ||
          customer.taxNumber ||
          "",

        billingAddress: {
          line1: billingAddress.line1 || "",
          line2: billingAddress.line2 || "",
          city: billingAddress.city || "",
          state: billingAddress.state || "",
          country: billingAddress.country || "",
          postalCode: billingAddress.postalCode || "",
        },

        shippingAddress: {
          line1: shippingAddress.line1 || "",
          line2: shippingAddress.line2 || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          country: shippingAddress.country || "",
          postalCode: shippingAddress.postalCode || "",
        },
      },
    };
  }

  if (payload.newCustomer) {
    const newCustomer = payload.newCustomer;

    const name =
      String(
        newCustomer.name ||
          newCustomer.companyName ||
          ""
      ).trim();

    const companyName =
      String(
        newCustomer.companyName ||
          newCustomer.name ||
          ""
      ).trim();

    if (!name && !companyName) {
      throw new Error(
        "New customer name or company name is required"
      );
    }

    const billingAddress =
      newCustomer.billingAddress || {};

    const shippingAddress =
      newCustomer.shippingAddress || {};

    return {
      customer: null,
      customerId: null,
      newCustomer,

      snapshot: {
        name,
        companyName,

        email:
          String(newCustomer.email || "").trim(),

        phone:
          String(newCustomer.phone || "").trim(),

        gstin:
          newCustomer.gstin ||
          newCustomer.gstNumber ||
          newCustomer.taxNumber ||
          "",

        billingAddress: {
          line1: billingAddress.line1 || "",
          line2: billingAddress.line2 || "",
          city: billingAddress.city || "",
          state: billingAddress.state || "",
          country: billingAddress.country || "",
          postalCode: billingAddress.postalCode || "",
        },

        shippingAddress: {
          line1: shippingAddress.line1 || "",
          line2: shippingAddress.line2 || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          country: shippingAddress.country || "",
          postalCode: shippingAddress.postalCode || "",
        },
      },
    };
  }

  throw new Error(
    "Either customerId or newCustomer is required"
  );
};

const getCustomerSnapshot = (customer, newCustomer) => {
  if (customer) {
    const billingAddress =
      customer.billingAddress ||
      customer.address ||
      {};

    const shippingAddress =
      customer.shippingAddress ||
      customer.billingAddress ||
      customer.address ||
      {};

    return {
      name: customer.name || "",
      companyName:
        customer.companyName ||
        customer.businessName ||
        "",
      email: customer.email || "",
      phone: customer.phone || "",
      gstin: normalizeGstin(
        customer.gstin || customer.gstNumber
      ),
      billingAddress: normalizeAddress(billingAddress),
      shippingAddress: normalizeAddress(shippingAddress),
    };
  }

  return {
    name: newCustomer.name,
    companyName: newCustomer.companyName,
    email: newCustomer.email,
    phone: newCustomer.phone,
    gstin: newCustomer.gstin,
    billingAddress: newCustomer.billingAddress,
    shippingAddress: newCustomer.shippingAddress,
  };
};

const getCompanySnapshot = (company, branch) => {
  return {
    name: company.name || "",
    legalName: company.legalName || "",
    email: company.email || "",
    phone: company.phone || "",
    website: company.website || "",
    registrationNumber: company.registrationNumber || "",
    gstin: getCompanyGstin(company),
    logo: company.logo || "",
    address: normalizeAddress(
      branch?.address ||
        company.address ||
        {}
    ),
  };
};

const buildItems = async (
  items = [],
  companyId,
  supplyType,
  { lookupProducts = true } = {}
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one invoice item is required");
  }

  if (!SUPPLY_TYPES.includes(supplyType)) {
    throw new Error(
      "supplyType must be resolved before calculating GST"
    );
  }

  const isIgst =
    IGST_SUPPLY_TYPES.includes(supplyType);

  const result = [];

  for (const item of items) {
    let product = null;

    if (lookupProducts && item.productId) {
      if (!mongoose.isValidObjectId(item.productId)) {
        throw new Error(`Invalid productId: ${item.productId}`);
      }

      product = await Product.findOne({
        _id: item.productId,
        companyId,
        deletedAt: null,
      }).lean();

      if (!product) {
        throw new Error(
          `Product not found: ${item.productId}`
        );
      }
    }

    const quantity = Number(item.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(
        `Invalid quantity for item: ${
          item.name || product?.name || "Unknown"
        }`
      );
    }

    const unitPrice = Number(
      item.unitPrice ??
        product?.sellingPrice ??
        product?.salePrice ??
        0
    );

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(
        `Invalid unit price for item: ${
          item.name || product?.name || "Unknown"
        }`
      );
    }

    const itemLabel =
      item.name || product?.name || "Unknown";

    if (
      item.discountType !== undefined &&
      item.discountType !== null &&
      item.discountType !== "" &&
      !["percentage", "fixed"].includes(item.discountType)
    ) {
      throw badRequest(
        `Invalid discount type for item: ${itemLabel}`
      );
    }

    const discountType =
      item.discountType === "fixed"
        ? "fixed"
        : "percentage";

    const discountValue = Number(
      item.discountValue || 0
    );

    if (
      !Number.isFinite(discountValue) ||
      discountValue < 0
    ) {
      throw badRequest(
        `Discount cannot be negative for item: ${itemLabel}`
      );
    }

    const grossAmount = round2(
      quantity * round2(unitPrice)
    );

    let discountAmount = 0;

    if (discountType === "percentage") {
      if (discountValue > 100) {
        throw badRequest(
          `Discount percentage cannot exceed 100% for item: ${itemLabel}`
        );
      }

      discountAmount = round2(
        (grossAmount * discountValue) / 100
      );
    } else {
      if (discountValue > grossAmount) {
        throw badRequest(
          `Fixed discount cannot exceed gross amount (${grossAmount}) for item: ${itemLabel}`
        );
      }

      discountAmount = round2(discountValue);
    }

    // Discount is deducted BEFORE GST.
    const taxableAmount = round2(
      Math.max(0, grossAmount - discountAmount)
    );

    const gstRate = Number(
      item.gstRate ??
        product?.gstRate ??
        product?.taxRate ??
        0
    );

    if (
      !Number.isFinite(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      throw badRequest(
        `GST rate must be between 0 and 100 for item: ${itemLabel}`
      );
    }

    const totalTax = round2(
      (taxableAmount * gstRate) / 100
    );

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isIgst) {
      igstRate = gstRate;
      igstAmount = totalTax;
    } else {
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      // Split the tax amount so CGST + SGST always equals totalTax.
      cgstAmount = round2(totalTax / 2);
      sgstAmount = round2(totalTax - cgstAmount);
    }

    const lineTotal = round2(
      taxableAmount + totalTax
    );

    result.push({
      productId:
        product?._id ||
        item.productId ||
        null,

      productCode:
        item.productCode ||
        product?.productCode ||
        "",

      sku:
        item.sku ||
        product?.sku ||
        "",

      name:
        item.name ||
        product?.name ||
        "Item",

      description:
        item.description ||
        product?.description ||
        "",

      hsnSac:
        item.hsnSac ||
        product?.hsnSac ||
        product?.hsnCode ||
        "",

      unit:
        item.unit ||
        product?.unit ||
        "PCS",

      quantity,

      unitPrice: round2(unitPrice),

      grossAmount,

      discountType,

      discountValue: round2(discountValue),

      discountAmount,

      taxableAmount,

      gstRate: round2(gstRate),

      cgstRate,

      sgstRate,

      igstRate,

      cgstAmount,

      sgstAmount,

      igstAmount,

      totalTax,

      lineTotal,
    });
  }

  return result;
};

/*
 * All totals are recalculated server-side. Frontend totals
 * (subtotal, tax, roundOff, grandTotal, balance) are ignored.
 */
const calculateTotals = (items, payload) => {
  const subtotal = round2(
    items.reduce(
      (sum, item) =>
        sum + Number(item.grossAmount || 0),
      0
    )
  );

  const totalDiscount = round2(
    items.reduce(
      (sum, item) =>
        sum + Number(item.discountAmount || 0),
      0
    )
  );

  const taxableAmount = round2(
    items.reduce(
      (sum, item) =>
        sum + Number(item.taxableAmount || 0),
      0
    )
  );

  const cgstAmount = round2(
    items.reduce(
      (sum, item) =>
        sum + Number(item.cgstAmount || 0),
      0
    )
  );

  const sgstAmount = round2(
    items.reduce(
      (sum, item) =>
        sum + Number(item.sgstAmount || 0),
      0
    )
  );

  const igstAmount = round2(
    items.reduce(
      (sum, item) =>
        sum + Number(item.igstAmount || 0),
      0
    )
  );

  const totalTax = round2(
    cgstAmount +
      sgstAmount +
      igstAmount
  );

  const shippingCharges = parseCharge(
    payload.shippingCharges,
    "Shipping charges"
  );

  const otherCharges = parseCharge(
    payload.otherCharges,
    "Other charges"
  );

  const beforeRoundOff = round2(
    taxableAmount +
      totalTax +
      shippingCharges +
      otherCharges
  );

  // Round to the nearest rupee; roundOff is always between -0.50 and +0.50.
  const roundOff = round2(
    Math.round(beforeRoundOff) -
      beforeRoundOff
  );

  const grandTotal = round2(
    Math.max(0, beforeRoundOff + roundOff)
  );

  const paidAmount = parseCharge(
    payload.paidAmount,
    "Paid amount"
  );

  if (paidAmount > grandTotal) {
    throw badRequest(
      `Paid amount (${paidAmount}) cannot exceed grand total (${grandTotal})`
    );
  }

  const balanceAmount = round2(
    Math.max(
      0,
      grandTotal - paidAmount
    )
  );

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    shippingCharges,
    otherCharges,
    roundOff,
    grandTotal,
    paidAmount,
    balanceAmount,
    amountInWords: amountInWords(grandTotal),
  };
};

const getPaymentStatus = (
  grandTotal,
  paidAmount
) => {
  if (paidAmount <= 0) {
    return "unpaid";
  }

  if (paidAmount >= grandTotal) {
    return "paid";
  }

  return "partial";
};

const getInvoiceStatus = (
  paymentStatus,
  dueDate,
  currentStatus = "draft"
) => {
  if (currentStatus === "cancelled") {
    return "cancelled";
  }

  if (paymentStatus === "paid") {
    return "paid";
  }

  if (
    dueDate &&
    new Date(dueDate) < new Date() &&
    paymentStatus !== "paid"
  ) {
    return "overdue";
  }

  if (paymentStatus === "partial") {
    return "partially_paid";
  }

  return currentStatus;
};

const generateInvoiceNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const prefix = `INV-${year}-`;

  const lastInvoice = await Invoice.findOne({
    companyId,
    invoiceNumber: {
      $regex: `^${prefix}`,
    },
  })
    .sort({ createdAt: -1 })
    .select("invoiceNumber")
    .lean();

  let nextNumber = 1;

  if (lastInvoice?.invoiceNumber) {
    const match =
      lastInvoice.invoiceNumber.match(
        /(\d+)$/
      );

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  return `${prefix}${String(
    nextNumber
  ).padStart(5, "0")}`;
};

const populateInvoice = (query) =>
  query
    .populate(
      "customerId",
      "name companyName email phone gstin gstNumber"
    )
    .populate(
      "branchId",
      "name code address"
    )
    .populate(
      "salesId",
      "invoiceNumber saleDate grandTotal status"
    )
    .populate(
      "salesOrderId",
      "orderNumber orderDate grandTotal status"
    )
    .populate(
      "quotationId",
      "quotationNumber quotationDate grandTotal status"
    )
    .populate(
      "items.productId",
      "productCode sku name displayName hsnSac hsnCode gstRate unit sellingPrice"
    );

const createInvoice = async (req, res) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const payload = req.body || {};

    const {
  customer,
  customerId,
  newCustomer,
} = await getCustomerFromPayload(
  payload,
  req.companyId
);

    let branch = null;

    if (payload.branchId) {
      branch = await Branch.findOne({
        _id: payload.branchId,
        companyId: company._id,
        deletedAt: null,
      }).lean();

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "Branch not found in your company",
        });
      }
    }

    const finalCustomerSnapshot =
      getCustomerSnapshot(
        customer,
        newCustomer
      );

    const companySnapshot =
      getCompanySnapshot(
        company,
        branch
      );

    const billingAddress =
      normalizeAddress(
        payload.billingAddress ||
          finalCustomerSnapshot.billingAddress
      );

    const shippingAddress =
      normalizeAddress(
        payload.shippingAddress ||
          finalCustomerSnapshot.shippingAddress
      );

    const placeOfSupply =
      payload.placeOfSupply ||
      getDefaultPlaceOfSupply(
        finalCustomerSnapshot,
        shippingAddress,
        billingAddress
      );

    // Resolve supply type BEFORE GST calculation.
    const supplyType =
      resolveSupplyType({
        requested: payload.supplyType,
        companySnapshot,
        customerSnapshot:
          finalCustomerSnapshot,
        placeOfSupply,
        shippingAddress,
        billingAddress,
      });

    const items = await buildItems(
      payload.items,
      company._id,
      supplyType
    );

    const totals = calculateTotals(
      items,
      payload
    );

    const invoiceNumber =
      payload.invoiceNumber ||
      (await generateInvoiceNumber(
        company._id
      ));

    const paymentStatus =
      getPaymentStatus(
        totals.grandTotal,
        totals.paidAmount
      );

    const status =
      payload.status === "issued"
        ? getInvoiceStatus(
            paymentStatus,
            payload.dueDate,
            "issued"
          )
        : getInvoiceStatus(
            paymentStatus,
            payload.dueDate,
            "draft"
          );

    const invoice =
      await Invoice.create({
        companyId: company._id,

        branchId:
          branch?._id ||
          payload.branchId ||
          null,

        customerId,

        salesId:
          payload.salesId || null,

        salesOrderId:
          payload.salesOrderId || null,

        quotationId:
          payload.quotationId || null,

        invoiceNumber,

        referenceNumber:
          payload.referenceNumber || "",

        invoiceDate:
          payload.invoiceDate ||
          new Date(),

        dueDate:
          payload.dueDate || null,

        status,

        paymentStatus,

        paymentMethod:
          payload.paymentMethod ||
          "credit",

        currency:
          payload.currency ||
          company.currency ||
          "INR",

        companySnapshot,

        customerSnapshot:
          finalCustomerSnapshot,

        billingAddress,

        shippingAddress,

        placeOfSupply,

        supplyType,

        reverseCharge:
          Boolean(payload.reverseCharge),

        items,

        ...totals,

        notes:
          payload.notes || "",

        termsAndConditions:
          payload.termsAndConditions ||
          "",

        customerNotes:
          payload.customerNotes || "",

        issuedAt:
          status !== "draft"
            ? new Date()
            : null,

        paidAt:
          paymentStatus === "paid"
            ? new Date()
            : null,

        createdBy:
          req.userId || null,

        updatedBy:
          req.userId || null,
      });

    const populated =
      await populateInvoice(
        Invoice.findById(invoice._id)
      );

    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "createInvoice error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getInvoices = async (req, res) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const page = Math.max(
      1,
      Number(req.query.page || 1)
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(req.query.limit || 20)
      )
    );

    const skip = (page - 1) * limit;

    const filter = {
      companyId: company._id,
      deletedAt: null,
    };

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus =
        req.query.paymentStatus;
    }

    if (req.query.customerId) {
      filter.customerId =
        req.query.customerId;
    }

    if (req.query.branchId) {
      filter.branchId =
        req.query.branchId;
    }

    if (req.query.search) {
      const search =
        String(req.query.search).trim();

      filter.$or = [
        {
          invoiceNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          referenceNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customerSnapshot.name": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customerSnapshot.companyName": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const [
      invoices,
      total,
    ] = await Promise.all([
      populateInvoice(
        Invoice.find(filter)
          .sort({
            invoiceDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
      ),

      Invoice.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(
          total / limit
        ),
      },
    });
  } catch (error) {
    console.error(
      "getInvoices error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getInvoiceById = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const invoice =
      await populateInvoice(
        Invoice.findOne({
          _id: req.params.id,
          companyId: company._id,
          deletedAt: null,
        })
      );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error(
      "getInvoiceById error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateInvoice = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const invoice =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      ["paid", "cancelled"].includes(
        invoice.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Paid or cancelled invoices cannot be edited",
      });
    }

    const payload = req.body || {};

    if (
      payload.customerId ||
      payload.newCustomer ||
      payload.customer
    ) {
      const customerData =
        await getCustomerFromPayload(
          req,
          payload,
          company
        );

      invoice.customerId =
        customerData.customerId;

      invoice.customerSnapshot =
        getCustomerSnapshot(
          customerData.customer,
          customerData.newCustomer
        );

      // New customer: default addresses to the new customer's.
      if (payload.billingAddress === undefined) {
        invoice.billingAddress =
          invoice.customerSnapshot.billingAddress;
      }

      if (payload.shippingAddress === undefined) {
        invoice.shippingAddress =
          invoice.customerSnapshot.shippingAddress;
      }
    }

    if (payload.branchId) {
      const branch =
        await Branch.findOne({
          _id: payload.branchId,
          companyId: company._id,
          deletedAt: null,
        }).lean();

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "Branch not found in your company",
        });
      }

      invoice.branchId =
        branch._id;

      invoice.companySnapshot =
        getCompanySnapshot(
          company,
          branch
        );
    }

    // supplyType and amountInWords are derived below, not copied as-is.
    const editableFields = [
      "referenceNumber",
      "invoiceDate",
      "dueDate",
      "paymentMethod",
      "currency",
      "billingAddress",
      "shippingAddress",
      "placeOfSupply",
      "reverseCharge",
      "notes",
      "termsAndConditions",
      "customerNotes",
      "salesId",
      "salesOrderId",
      "quotationId",
    ];

    for (const field of editableFields) {
      if (
        payload[field] !== undefined
      ) {
        if (
          field ===
            "billingAddress" ||
          field ===
            "shippingAddress"
        ) {
          invoice[field] =
            normalizeAddress(
              payload[field]
            );
        } else {
          invoice[field] =
            payload[field];
        }
      }
    }

    const locationChanged = [
      "customerId",
      "newCustomer",
      "customer",
      "branchId",
      "placeOfSupply",
      "billingAddress",
      "shippingAddress",
    ].some(
      (field) =>
        payload[field] !== undefined
    );

    if (
      locationChanged &&
      payload.placeOfSupply === undefined
    ) {
      invoice.placeOfSupply =
        getDefaultPlaceOfSupply(
          invoice.customerSnapshot,
          invoice.shippingAddress,
          invoice.billingAddress
        ) || invoice.placeOfSupply;
    }

    // Resolve supply type BEFORE GST calculation.
    // Unchanged location + no explicit value keeps the stored type.
    const supplyType =
      resolveSupplyType({
        requested:
          payload.supplyType !== undefined
            ? payload.supplyType
            : locationChanged
            ? undefined
            : invoice.supplyType,
        companySnapshot:
          invoice.companySnapshot,
        customerSnapshot:
          invoice.customerSnapshot,
        placeOfSupply:
          invoice.placeOfSupply,
        shippingAddress:
          invoice.shippingAddress,
        billingAddress:
          invoice.billingAddress,
        fallback: invoice.supplyType,
      });

    const needsRecalculation =
      payload.items !== undefined ||
      supplyType !== invoice.supplyType ||
      payload.shippingCharges !== undefined ||
      payload.otherCharges !== undefined ||
      payload.paidAmount !== undefined;

    if (needsRecalculation) {
      const items =
        await buildItems(
          payload.items !== undefined
            ? payload.items
            : invoice.items.map((item) =>
                item.toObject()
              ),
          company._id,
          supplyType,
          {
            lookupProducts:
              payload.items !== undefined,
          }
        );

      // Missing charges/payment keep their stored values.
      const totals =
        calculateTotals(items, {
          shippingCharges:
            payload.shippingCharges ??
            invoice.shippingCharges,
          otherCharges:
            payload.otherCharges ??
            invoice.otherCharges,
          paidAmount:
            payload.paidAmount ??
            invoice.paidAmount,
        });

      invoice.supplyType = supplyType;
      invoice.items = items;
      invoice.set(totals);
    }

    invoice.paymentStatus =
      getPaymentStatus(
        invoice.grandTotal,
        invoice.paidAmount
      );

    invoice.status =
      getInvoiceStatus(
        invoice.paymentStatus,
        invoice.dueDate,
        invoice.status
      );

    if (
      invoice.paymentStatus ===
      "paid"
    ) {
      invoice.paidAt =
        invoice.paidAt ||
        new Date();
    } else {
      invoice.paidAt = null;
    }

    invoice.updatedBy =
      req.userId || null;

    await invoice.save();

    const populated =
      await populateInvoice(
        Invoice.findById(invoice._id)
      );

    return res.json({
      success: true,
      message:
        "Invoice updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "updateInvoice error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteInvoice = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const invoice =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      ["issued", "partially_paid", "paid"].includes(
        invoice.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Issued or paid invoices cannot be deleted. Cancel the invoice instead.",
      });
    }

    invoice.deletedAt = new Date();
    invoice.deletedBy =
      req.userId || null;
    invoice.updatedBy =
      req.userId || null;

    await invoice.save();

    return res.json({
      success: true,
      message:
        "Invoice deleted successfully",
    });
  } catch (error) {
    console.error(
      "deleteInvoice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const issueInvoice = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const invoice =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      invoice.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled invoice cannot be issued",
      });
    }

    invoice.status =
      getInvoiceStatus(
        invoice.paymentStatus,
        invoice.dueDate,
        "issued"
      );

    invoice.issuedAt =
      invoice.issuedAt ||
      new Date();

    invoice.updatedBy =
      req.userId || null;

    await invoice.save();

    const populated =
      await populateInvoice(
        Invoice.findById(invoice._id)
      );

    return res.json({
      success: true,
      message:
        "Invoice issued successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "issueInvoice error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const recordPayment = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const invoice =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      invoice.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot record payment for cancelled invoice",
      });
    }

    const amount = round2(
      Number(req.body.amount)
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount must be greater than zero",
      });
    }

    const remaining =
      round2(
        invoice.grandTotal -
          invoice.paidAmount
      );

    if (amount > remaining) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount exceeds invoice balance",
      });
    }

    invoice.paidAmount =
      round2(
        invoice.paidAmount + amount
      );

    invoice.balanceAmount =
      round2(
        invoice.grandTotal -
          invoice.paidAmount
      );

    invoice.paymentMethod =
      req.body.paymentMethod ||
      invoice.paymentMethod;

    invoice.paymentStatus =
      getPaymentStatus(
        invoice.grandTotal,
        invoice.paidAmount
      );

    invoice.status =
      getInvoiceStatus(
        invoice.paymentStatus,
        invoice.dueDate,
        invoice.status === "draft"
          ? "issued"
          : invoice.status
      );

    if (
      invoice.paymentStatus ===
      "paid"
    ) {
      invoice.paidAt = new Date();
    }

    invoice.updatedBy =
      req.userId || null;

    await invoice.save();

    const populated =
      await populateInvoice(
        Invoice.findById(invoice._id)
      );

    return res.json({
      success: true,
      message:
        "Payment recorded successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "recordPayment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const cancelInvoice = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const invoice =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      invoice.paymentStatus === "paid"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Paid invoice cannot be cancelled",
      });
    }

    invoice.status = "cancelled";
    invoice.cancelledAt =
      new Date();

    invoice.cancelledReason =
      req.body.reason ||
      "Invoice cancelled";

    invoice.updatedBy =
      req.userId || null;

    await invoice.save();

    const populated =
      await populateInvoice(
        Invoice.findById(invoice._id)
      );

    return res.json({
      success: true,
      message:
        "Invoice cancelled successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "cancelInvoice error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const downloadInvoicePdf = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const invoice =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      })
        .populate(
          "customerId",
          "name companyName email phone gstin gstNumber"
        )
        .populate(
          "branchId",
          "name code address"
        )
        .populate(
          "salesOrderId",
          "orderNumber orderDate"
        )
        .populate(
          "salesId",
          "invoiceNumber saleDate"
        )
        .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    await generateInvoicePdf(
      invoice,
      res
    );
  } catch (error) {
    console.error(
      "downloadInvoicePdf error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate invoice PDF",
        error: error.message,
      });
    }
  }
};

const getInvoiceSummary = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const match = {
      companyId: company._id,
      deletedAt: null,
    };

    const [
      summary,
      statusBreakdown,
      paymentBreakdown,
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalInvoices: {
              $sum: 1,
            },
            subtotal: {
              $sum: "$subtotal",
            },
            taxableAmount: {
              $sum: "$taxableAmount",
            },
            totalTax: {
              $sum: "$totalTax",
            },
            grandTotal: {
              $sum: "$grandTotal",
            },
            paidAmount: {
              $sum: "$paidAmount",
            },
            balanceAmount: {
              $sum: "$balanceAmount",
            },
          },
        },
      ]),

      Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$grandTotal",
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$paymentStatus",
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$grandTotal",
            },
            paid: {
              $sum: "$paidAmount",
            },
            balance: {
              $sum: "$balanceAmount",
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        totals:
          summary[0] || {
            totalInvoices: 0,
            subtotal: 0,
            taxableAmount: 0,
            totalTax: 0,
            grandTotal: 0,
            paidAmount: 0,
            balanceAmount: 0,
          },

        statusBreakdown,

        paymentBreakdown,
      },
    });
  } catch (error) {
    console.error(
      "getInvoiceSummary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const duplicateInvoice = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company workspace not found",
      });
    }

    const original =
      await Invoice.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      }).lean();

    if (!original) {
      return res.status(404).json({
        success: false,
        message:
          "Invoice not found",
      });
    }

    const invoiceNumber =
      await generateInvoiceNumber(
        company._id
      );

    const duplicateData = {
      ...original,

      _id: undefined,

      invoiceNumber,

      invoiceDate: new Date(),

      dueDate: null,

      status: "draft",

      paymentStatus: "unpaid",

      paidAmount: 0,

      balanceAmount:
        original.grandTotal,

      salesId: null,

      salesOrderId: null,

      quotationId: null,

      issuedAt: null,

      paidAt: null,

      cancelledAt: null,

      cancelledReason: "",

      createdBy:
        req.userId || null,

      updatedBy:
        req.userId || null,

      deletedAt: null,

      deletedBy: null,

      createdAt: undefined,

      updatedAt: undefined,
    };

    const duplicate =
      await Invoice.create(
        duplicateData
      );

    const populated =
      await populateInvoice(
        Invoice.findById(
          duplicate._id
        )
      );

    return res.status(201).json({
      success: true,
      message:
        "Invoice duplicated successfully",
      data: populated,
    });
  } catch (error) {
    console.error(
      "duplicateInvoice error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  issueInvoice,
  recordPayment,
  cancelInvoice,
  getInvoiceSummary,
  duplicateInvoice,
  downloadInvoicePdf,
};