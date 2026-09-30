const mongoose = require("mongoose");

const Expense = require("../models/expense");
const Company = require("../models/company");
const Branch = require("../models/branch");
const Vendor = require("../models/vendor");

const roundAmount = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const validateObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
};

const getCompany = async (req) => {
  const company = await Company.findOne({
    workspaceId: req.companyId,
    status: "active",
  })
    .select("_id workspaceId name legalName email phone gstNumber currency status")
    .lean();

  if (!company) {
    throw new Error("Company not found");
  }

  return company;
};

const getBranch = async (branchId, companyId) => {
  if (!branchId) {
    return null;
  }

  validateObjectId(branchId, "branch ID");

  const branch = await Branch.findOne({
    _id: branchId,
    companyId,
  }).lean();

  if (!branch) {
    throw new Error("Branch not found in your company");
  }

  return branch;
};

const getVendor = async (vendorId, workspaceId) => {
  if (!vendorId) {
    return null;
  }

  validateObjectId(vendorId, "vendor ID");

  const vendor = await Vendor.findOne({
    _id: vendorId,
    companyId: workspaceId,
    deletedAt: null,
  }).lean();

  if (!vendor) {
    throw new Error("Vendor not found in your workspace");
  }

  return vendor;
};

const generateExpenseNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const prefix = `EXP-${year}-`;

  const latest = await Expense.findOne({
    companyId,
    expenseNumber: {
      $regex: `^${prefix}`,
    },
  })
    .sort({ expenseNumber: -1 })
    .select("expenseNumber")
    .lean();

  let nextNumber = 1;

  if (latest?.expenseNumber) {
    const currentNumber = Number(
      latest.expenseNumber.replace(prefix, "")
    );

    if (Number.isFinite(currentNumber)) {
      nextNumber = currentNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

const getVendorSnapshot = (vendor) => {
  if (!vendor) {
    return {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      gstin: "",
      billingAddress: null,
      shippingAddress: null,
    };
  }

  return {
    name:
      vendor.displayName ||
      vendor.name ||
      vendor.companyName ||
      "",

    companyName:
      vendor.companyName ||
      vendor.name ||
      "",

    email: vendor.email || "",

    phone:
      vendor.phone ||
      vendor.mobile ||
      "",

    gstin:
      vendor.gstin ||
      vendor.gstNumber ||
      "",

    billingAddress:
      vendor.billingAddress ||
      vendor.address ||
      null,

    shippingAddress:
      vendor.shippingAddress ||
      vendor.billingAddress ||
      vendor.address ||
      null,
  };
};

const calculateItem = (item, supplyType) => {
  const quantity = Math.max(
    Number(item.quantity) || 0,
    0
  );

  const unitPrice = Math.max(
    Number(item.unitPrice) || 0,
    0
  );

  const grossAmount = roundAmount(
    quantity * unitPrice
  );

  const discountType =
    item.discountType === "percentage"
      ? "percentage"
      : "fixed";

  const discountValue = Math.max(
    Number(item.discountValue) || 0,
    0
  );

  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount = roundAmount(
      (grossAmount * Math.min(discountValue, 100)) /
        100
    );
  } else {
    discountAmount = roundAmount(
      Math.min(discountValue, grossAmount)
    );
  }

  const taxableAmount = roundAmount(
    Math.max(grossAmount - discountAmount, 0)
  );

  const gstRate = Math.max(
    Number(item.gstRate) || 0,
    0
  );

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;

  if (supplyType === "inter_state") {
    igstRate = gstRate;
  } else {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
  }

  const cgstAmount = roundAmount(
    (taxableAmount * cgstRate) / 100
  );

  const sgstAmount = roundAmount(
    (taxableAmount * sgstRate) / 100
  );

  const igstAmount = roundAmount(
    (taxableAmount * igstRate) / 100
  );

  const totalTax = roundAmount(
    cgstAmount +
      sgstAmount +
      igstAmount
  );

  const lineTotal = roundAmount(
    taxableAmount + totalTax
  );

  return {
    description:
      String(item.description || "").trim(),

    category:
      String(item.category || "General").trim(),

    quantity,

    unitPrice,

    discountType,

    discountValue,

    discountAmount,

    taxableAmount,

    gstRate,

    cgstRate,

    sgstRate,

    igstRate,

    cgstAmount,

    sgstAmount,

    igstAmount,

    totalTax,

    lineTotal,
  };
};

const calculateExpenseTotals = (
  items,
  supplyType,
  shippingCharges,
  otherCharges,
  roundOff
) => {
  const calculatedItems = items.map((item) =>
    calculateItem(item, supplyType)
  );

  const subtotal = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum +
        item.quantity * item.unitPrice,
      0
    )
  );

  const totalDiscount = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum + item.discountAmount,
      0
    )
  );

  const taxableAmount = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum + item.taxableAmount,
      0
    )
  );

  const cgstAmount = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum + item.cgstAmount,
      0
    )
  );

  const sgstAmount = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum + item.sgstAmount,
      0
    )
  );

  const igstAmount = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum + item.igstAmount,
      0
    )
  );

  const totalTax = roundAmount(
    calculatedItems.reduce(
      (sum, item) =>
        sum + item.totalTax,
      0
    )
  );

  const safeShippingCharges = roundAmount(
    Math.max(Number(shippingCharges) || 0, 0)
  );

  const safeOtherCharges = roundAmount(
    Math.max(Number(otherCharges) || 0, 0)
  );

  const safeRoundOff = roundAmount(
    Number(roundOff) || 0
  );

  const grandTotal = roundAmount(
    taxableAmount +
      totalTax +
      safeShippingCharges +
      safeOtherCharges +
      safeRoundOff
  );

  return {
    items: calculatedItems,
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    shippingCharges: safeShippingCharges,
    otherCharges: safeOtherCharges,
    roundOff: safeRoundOff,
    grandTotal,
  };
};

const getPaymentStatus = (
  paidAmount,
  grandTotal
) => {
  if (paidAmount <= 0) {
    return "unpaid";
  }

  if (paidAmount >= grandTotal) {
    return "paid";
  }

  return "partial";
};

const normalizePagination = (page, limit) => {
  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const createExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    const payload = req.body || {};

    if (
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one expense item is required",
      });
    }

    if (payload.branchId) {
      await getBranch(
        payload.branchId,
        company._id
      );
    }

    let vendor = null;

    if (payload.vendorId) {
      vendor = await getVendor(
        payload.vendorId,
        req.companyId
      );
    }

    const supplyType =
      payload.supplyType === "inter_state"
        ? "inter_state"
        : "intra_state";

    const totals =
      calculateExpenseTotals(
        payload.items,
        supplyType,
        payload.shippingCharges,
        payload.otherCharges,
        payload.roundOff
      );

    const grandTotal = totals.grandTotal;

    const paidAmount = roundAmount(
      Math.max(Number(payload.paidAmount) || 0, 0)
    );

    if (paidAmount > grandTotal) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot exceed expense total",
      });
    }

    const balanceAmount = roundAmount(
      Math.max(grandTotal - paidAmount, 0)
    );

    const paymentStatus =
      getPaymentStatus(
        paidAmount,
        grandTotal
      );

    const expenseNumber =
      await generateExpenseNumber(
        company._id
      );

    const expense = await Expense.create({
      companyId: company._id,

      branchId:
        payload.branchId || null,

      vendorId:
        payload.vendorId || null,

      expenseNumber,

      referenceNumber:
        payload.referenceNumber || "",

      expenseDate:
        payload.expenseDate ||
        new Date(),

      dueDate:
        payload.dueDate || null,

      category:
        payload.category || "General",

      subCategory:
        payload.subCategory || "",

      expenseType:
        payload.expenseType ||
        "operational",

      status:
        payload.status === "submitted"
          ? "submitted"
          : "draft",

      paymentStatus,

      paymentMethod:
        payload.paymentMethod ||
        "cash",

      currency:
        payload.currency ||
        company.currency ||
        "INR",

      placeOfSupply:
        payload.placeOfSupply || "",

      supplyType,

      reverseCharge:
        Boolean(payload.reverseCharge),

      vendorSnapshot:
        getVendorSnapshot(vendor),

      billingAddress:
        payload.billingAddress ||
        vendor?.billingAddress ||
        null,

      shippingAddress:
        payload.shippingAddress ||
        vendor?.shippingAddress ||
        null,

      items: totals.items,

      subtotal: totals.subtotal,

      totalDiscount:
        totals.totalDiscount,

      taxableAmount:
        totals.taxableAmount,

      cgstAmount:
        totals.cgstAmount,

      sgstAmount:
        totals.sgstAmount,

      igstAmount:
        totals.igstAmount,

      totalTax:
        totals.totalTax,

      shippingCharges:
        totals.shippingCharges,

      otherCharges:
        totals.otherCharges,

      roundOff:
        totals.roundOff,

      grandTotal,

      paidAmount,

      balanceAmount,

      notes:
        payload.notes || "",

      termsAndConditions:
        payload.termsAndConditions || "",

      receiptUrl:
        payload.receiptUrl || "",

      attachmentUrl:
        payload.attachmentUrl || "",

      submittedAt:
        payload.status === "submitted"
          ? new Date()
          : null,

      createdBy:
        req.userId || null,

      updatedBy:
        req.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Create expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create expense",
    });
  }
};

const getExpenses = async (req, res) => {
  try {
    const company = await getCompany(req);

    const {
      page,
      limit,
      search,
      status,
      paymentStatus,
      paymentMethod,
      category,
      expenseType,
      vendorId,
      branchId,
      dateFrom,
      dateTo,
    } = req.query;

    const pagination =
      normalizePagination(page, limit);

    const filter = {
      companyId: company._id,
      deletedAt: null,
    };

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
    }

    if (paymentMethod) {
      filter.paymentMethod =
        paymentMethod;
    }

    if (category) {
      filter.category = category;
    }

    if (expenseType) {
      filter.expenseType =
        expenseType;
    }

    if (vendorId) {
      validateObjectId(
        vendorId,
        "vendor ID"
      );

      filter.vendorId = vendorId;
    }

    if (branchId) {
      validateObjectId(
        branchId,
        "branch ID"
      );

      await getBranch(
        branchId,
        company._id
      );

      filter.branchId = branchId;
    }

    if (dateFrom || dateTo) {
      filter.expenseDate = {};

      if (dateFrom) {
        filter.expenseDate.$gte =
          new Date(`${dateFrom}T00:00:00.000Z`);
      }

      if (dateTo) {
        filter.expenseDate.$lte =
          new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    if (search) {
      const regex = new RegExp(
        String(search).trim(),
        "i"
      );

      filter.$or = [
        {
          expenseNumber: regex,
        },
        {
          referenceNumber: regex,
        },
        {
          category: regex,
        },
        {
          subCategory: regex,
        },
        {
          "vendorSnapshot.name": regex,
        },
        {
          "vendorSnapshot.companyName":
            regex,
        },
      ];
    }

    const [expenses, total] =
      await Promise.all([
        Expense.find(filter)
          .sort({
            expenseDate: -1,
            createdAt: -1,
          })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .lean(),

        Expense.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      data: expenses,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(
          total / pagination.limit
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get expenses error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch expenses",
    });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      })
        .populate(
          "vendorId",
          "name companyName displayName email phone gstin gstNumber"
        )
        .populate(
          "branchId",
          "name code"
        )
        .lean();

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error(
      "Get expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch expense",
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (
      !["draft", "rejected"].includes(
        expense.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft or rejected expenses can be edited",
      });
    }

    const payload = req.body || {};

    if (payload.branchId) {
      await getBranch(
        payload.branchId,
        company._id
      );
    }

    let vendor = null;

    const finalVendorId =
      payload.vendorId !== undefined
        ? payload.vendorId
        : expense.vendorId;

    if (finalVendorId) {
      vendor = await getVendor(
        finalVendorId,
        req.companyId
      );
    }

    const items =
      Array.isArray(payload.items) &&
      payload.items.length > 0
        ? payload.items
        : expense.items;

    const supplyType =
      payload.supplyType ||
      expense.supplyType ||
      "intra_state";

    const totals =
      calculateExpenseTotals(
        items,
        supplyType,
        payload.shippingCharges !==
          undefined
          ? payload.shippingCharges
          : expense.shippingCharges,

        payload.otherCharges !==
          undefined
          ? payload.otherCharges
          : expense.otherCharges,

        payload.roundOff !==
          undefined
          ? payload.roundOff
          : expense.roundOff
      );

    const paidAmount = roundAmount(
      Math.max(
        Number(
          payload.paidAmount !== undefined
            ? payload.paidAmount
            : expense.paidAmount
        ) || 0,
        0
      )
    );

    if (paidAmount > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot exceed expense total",
      });
    }

    expense.branchId =
      payload.branchId !== undefined
        ? payload.branchId || null
        : expense.branchId;

    expense.vendorId =
      payload.vendorId !== undefined
        ? payload.vendorId || null
        : expense.vendorId;

    expense.referenceNumber =
      payload.referenceNumber !==
      undefined
        ? payload.referenceNumber
        : expense.referenceNumber;

    expense.expenseDate =
      payload.expenseDate ||
      expense.expenseDate;

    expense.dueDate =
      payload.dueDate !== undefined
        ? payload.dueDate || null
        : expense.dueDate;

    expense.category =
      payload.category !== undefined
        ? payload.category
        : expense.category;

    expense.subCategory =
      payload.subCategory !== undefined
        ? payload.subCategory
        : expense.subCategory;

    expense.expenseType =
      payload.expenseType !== undefined
        ? payload.expenseType
        : expense.expenseType;

    expense.paymentMethod =
      payload.paymentMethod !==
      undefined
        ? payload.paymentMethod
        : expense.paymentMethod;

    expense.currency =
      payload.currency ||
      expense.currency;

    expense.placeOfSupply =
      payload.placeOfSupply !==
      undefined
        ? payload.placeOfSupply
        : expense.placeOfSupply;

    expense.supplyType =
      supplyType;

    expense.reverseCharge =
      payload.reverseCharge !==
      undefined
        ? Boolean(payload.reverseCharge)
        : expense.reverseCharge;

    expense.vendorSnapshot =
      vendor
        ? getVendorSnapshot(vendor)
        : expense.vendorSnapshot;

    expense.billingAddress =
      payload.billingAddress !==
      undefined
        ? payload.billingAddress
        : expense.billingAddress;

    expense.shippingAddress =
      payload.shippingAddress !==
      undefined
        ? payload.shippingAddress
        : expense.shippingAddress;

    expense.items =
      totals.items;

    expense.subtotal =
      totals.subtotal;

    expense.totalDiscount =
      totals.totalDiscount;

    expense.taxableAmount =
      totals.taxableAmount;

    expense.cgstAmount =
      totals.cgstAmount;

    expense.sgstAmount =
      totals.sgstAmount;

    expense.igstAmount =
      totals.igstAmount;

    expense.totalTax =
      totals.totalTax;

    expense.shippingCharges =
      totals.shippingCharges;

    expense.otherCharges =
      totals.otherCharges;

    expense.roundOff =
      totals.roundOff;

    expense.grandTotal =
      totals.grandTotal;

    expense.paidAmount =
      paidAmount;

    expense.balanceAmount =
      roundAmount(
        Math.max(
          totals.grandTotal -
            paidAmount,
          0
        )
      );

    expense.paymentStatus =
      getPaymentStatus(
        paidAmount,
        totals.grandTotal
      );

    if (payload.notes !== undefined) {
      expense.notes =
        payload.notes;
    }

    if (
      payload.termsAndConditions !==
      undefined
    ) {
      expense.termsAndConditions =
        payload.termsAndConditions;
    }

    if (
      payload.receiptUrl !==
      undefined
    ) {
      expense.receiptUrl =
        payload.receiptUrl;
    }

    if (
      payload.attachmentUrl !==
      undefined
    ) {
      expense.attachmentUrl =
        payload.attachmentUrl;
    }

    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Update expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update expense",
    });
  }
};

const submitExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (
      !["draft", "rejected"].includes(
        expense.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft or rejected expenses can be submitted",
      });
    }

    expense.status = "submitted";
    expense.submittedAt = new Date();
    expense.rejectedAt = null;
    expense.rejectedBy = null;
    expense.rejectionReason = "";
    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense submitted successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Submit expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to submit expense",
    });
  }
};

const approveExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.status !== "submitted") {
      return res.status(400).json({
        success: false,
        message:
          "Only submitted expenses can be approved",
      });
    }

    expense.status = "approved";
    expense.approvedAt = new Date();
    expense.approvedBy =
      req.userId || null;
    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense approved successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Approve expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to approve expense",
    });
  }
};

const rejectExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.status !== "submitted") {
      return res.status(400).json({
        success: false,
        message:
          "Only submitted expenses can be rejected",
      });
    }

    const reason =
      req.body?.reason || "";

    expense.status = "rejected";
    expense.rejectedAt = new Date();
    expense.rejectedBy =
      req.userId || null;
    expense.rejectionReason =
      reason;
    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense rejected successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Reject expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to reject expense",
    });
  }
};

const payExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (
      !["approved", "submitted"].includes(
        expense.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only approved or submitted expenses can be paid",
      });
    }

    const requestedAmount =
      Number(req.body?.amount);

    const amount =
      Number.isFinite(requestedAmount) &&
      requestedAmount > 0
        ? roundAmount(requestedAmount)
        : expense.balanceAmount;

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount must be greater than zero",
      });
    }

    if (amount > expense.balanceAmount) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount cannot exceed balance amount",
      });
    }

    expense.paidAmount = roundAmount(
      expense.paidAmount + amount
    );

    expense.balanceAmount = roundAmount(
      Math.max(
        expense.grandTotal -
          expense.paidAmount,
        0
      )
    );

    expense.paymentStatus =
      getPaymentStatus(
        expense.paidAmount,
        expense.grandTotal
      );

    if (
      expense.paymentStatus === "paid"
    ) {
      expense.status = "paid";
      expense.paidAt = new Date();
    }

    if (req.body?.paymentMethod) {
      expense.paymentMethod =
        req.body.paymentMethod;
    }

    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense payment recorded successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Pay expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to record expense payment",
    });
  }
};

const cancelExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.status === "paid") {
      return res.status(400).json({
        success: false,
        message:
          "Paid expenses cannot be cancelled",
      });
    }

    if (expense.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Expense is already cancelled",
      });
    }

    expense.status = "cancelled";
    expense.cancelledAt = new Date();
    expense.cancelledBy =
      req.userId || null;
    expense.cancellationReason =
      req.body?.reason || "";
    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense cancelled successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Cancel expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel expense",
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "expense ID"
    );

    const expense =
      await Expense.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.status === "paid") {
      return res.status(400).json({
        success: false,
        message:
          "Paid expenses cannot be deleted",
      });
    }

    expense.deletedAt = new Date();
    expense.deletedBy =
      req.userId || null;
    expense.updatedBy =
      req.userId || null;

    await expense.save();

    return res.json({
      success: true,
      message:
        "Expense deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to delete expense",
    });
  }
};

const getExpenseSummary = async (req, res) => {
  try {
    const company = await getCompany(req);

    const [
      totalResult,
      statusResult,
      paymentResult,
      categoryResult,
      todayResult,
      monthResult,
    ] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            totalAmount: {
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

      Expense.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
          },
        },
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
      ]),

      Expense.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: "$paymentStatus",
            count: {
              $sum: 1,
            },
            amount: {
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

      Expense.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: "$category",
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
            amount: -1,
          },
        },
        {
          $limit: 10,
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
            expenseDate: {
              $gte: new Date(
                new Date().setHours(
                  0,
                  0,
                  0,
                  0
                )
              ),
              $lte: new Date(),
            },
          },
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$grandTotal",
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
            expenseDate: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
              $lte: new Date(),
            },
          },
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$grandTotal",
            },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        total: totalResult[0] || {
          count: 0,
          totalAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
        },

        byStatus: statusResult,

        byPaymentStatus:
          paymentResult,

        byCategory:
          categoryResult,

        today:
          todayResult[0] || {
            count: 0,
            amount: 0,
          },

        currentMonth:
          monthResult[0] || {
            count: 0,
            amount: 0,
          },
      },
    });
  } catch (error) {
    console.error(
      "Expense summary error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch expense summary",
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  payExpense,
  cancelExpense,
  deleteExpense,
  getExpenseSummary,
};