const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Branch = require("../models/Branch");
const Company = require("../models/Company");

const getCompany = async (req) => {
  const company = await Company.findOne({
    workspaceId: req.companyId,
    status: "active",
  })
    .select("_id workspaceId status name legalName currency")
    .lean();

  if (!company) {
    throw new Error("Company not found");
  }

  return company;
};

const validateObjectId = (value, fieldName) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
};

const getCustomer = async (customerId, workspaceId) => {
  validateObjectId(customerId, "customer ID");

  const customer = await Customer.findOne({
    _id: customerId,
    companyId: workspaceId,
    status: { $ne: "inactive" },
  }).lean();

  if (!customer) {
    throw new Error("Customer not found in your company");
  }

  return customer;
};

const getBranch = async (branchId, companyId) => {
  if (!branchId) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    throw new Error("Invalid branch ID");
  }

  const company = await Company.findOne({
    workspaceId: companyId,
    status: "active",
  })
    .select("_id workspaceId status")
    .lean();

  if (!company) {
    throw new Error("Company not found");
  }

  const branch = await Branch.findOne({
    _id: branchId,
    companyId: company._id,
  });

  if (!branch) {
    throw new Error("Branch not found in your company");
  }

  return branch;
};

const getInvoice = async (invoiceId, companyId) => {
  validateObjectId(invoiceId, "invoice ID");

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    companyId,
    deletedAt: null,
  });

  if (!invoice) {
    throw new Error("Invoice not found in your company");
  }

  return invoice;
};

const generatePaymentNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const lastPayment = await Payment.findOne({
    companyId,
    paymentNumber: new RegExp(`^PAY-${year}-`),
  })
    .sort({ createdAt: -1 })
    .select("paymentNumber")
    .lean();

  let nextNumber = 1;

  if (lastPayment?.paymentNumber) {
    const match = lastPayment.paymentNumber.match(
      new RegExp(`^PAY-${year}-(\\d+)$`)
    );

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `PAY-${year}-${String(nextNumber).padStart(6, "0")}`;
};

const roundAmount = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getInvoicePaidAmount = async (
  invoiceId,
  session = null
) => {
  const query = Payment.find({
    invoiceId,
    status: "completed",
    deletedAt: null,
  }).select("allocatedAmount");

  if (session) {
    query.session(session);
  }

  const payments = await query.lean();

  return roundAmount(
    payments.reduce(
      (sum, payment) =>
        sum + Number(payment.allocatedAmount || 0),
      0
    )
  );
};

const syncInvoicePayment = async (
  invoice,
  session = null
) => {
  const paidAmount = await getInvoicePaidAmount(
    invoice._id,
    session
  );

  const grandTotal = roundAmount(
    Number(invoice.grandTotal || 0)
  );

  const balanceAmount = Math.max(
    roundAmount(grandTotal - paidAmount),
    0
  );

  let paymentStatus = "unpaid";

  if (paidAmount >= grandTotal && grandTotal > 0) {
    paymentStatus = "paid";
  } else if (paidAmount > 0) {
    paymentStatus = "partial";
  }

  const update = {
    paidAmount,
    balanceAmount,
    paymentStatus,
  };

  if (
    paymentStatus === "paid" &&
    ["issued", "partially_paid", "overdue"].includes(
      invoice.status
    )
  ) {
    update.status = "paid";

    if (!invoice.paidAt) {
      update.paidAt = new Date();
    }
  } else if (
    paymentStatus === "partial" &&
    ["issued", "paid", "overdue"].includes(
      invoice.status
    )
  ) {
    update.status = "partially_paid";
    update.paidAt = null;
  } else if (
    paymentStatus === "unpaid" &&
    invoice.status === "partially_paid"
  ) {
    update.status = "issued";
    update.paidAt = null;
  }

  await Invoice.updateOne(
    { _id: invoice._id },
    { $set: update },
    session ? { session } : undefined
  );

  return {
    paidAmount,
    balanceAmount,
    paymentStatus,
  };
};

/*
|--------------------------------------------------------------------------
| CREATE PAYMENT
|--------------------------------------------------------------------------
*/

const createPayment = async (req, res) => {
  try {
    const payload = req.body || {};

    const company = await getCompany(req);

    const {
      customerId,
      invoiceId,
      branchId,
      amount,
      paymentDate,
      paymentMethod = "cash",
      referenceNumber = "",
      notes = "",
      status = "completed",
    } = payload;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

    if (
      ![
        "pending",
        "completed",
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New payment status must be pending or completed",
      });
    }

    const customer = await getCustomer(
      customerId,
      req.companyId
    );

    const branch = await getBranch(
      branchId,
      company._id
    );

    const invoice = await getInvoice(
      invoiceId,
      company._id
    );

    if (
      invoice.customerId &&
      String(invoice.customerId) !== String(customer._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer does not match the invoice customer",
      });
    }

    if (
      ["draft", "cancelled"].includes(invoice.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment cannot be recorded for this invoice status",
      });
    }

    const grandTotal = roundAmount(
      Number(invoice.grandTotal || 0)
    );

    const currentPaid = await getInvoicePaidAmount(
      invoice._id
    );

    const currentBalance = Math.max(
      roundAmount(grandTotal - currentPaid),
      0
    );

    if (numericAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds invoice balance. Maximum allowed: ${currentBalance.toFixed(
          2
        )}`,
        data: {
          invoiceTotal: grandTotal,
          paidAmount: currentPaid,
          balanceAmount: currentBalance,
          requestedAmount: numericAmount,
        },
      });
    }

    const paymentNumber =
      await generatePaymentNumber(company._id);

    const payment = await Payment.create({
      companyId: company._id,
      branchId: branch?._id || null,
      customerId: customer._id,
      invoiceId: invoice._id,
      paymentNumber,
      paymentDate: paymentDate
        ? new Date(paymentDate)
        : new Date(),
      amount: roundAmount(numericAmount),
      allocatedAmount:
        status === "completed"
          ? roundAmount(numericAmount)
          : 0,
      remainingAmount:
        status === "completed"
          ? 0
          : roundAmount(numericAmount),
      paymentMethod,
      referenceNumber: String(
        referenceNumber || ""
      ).trim(),
      status,
      notes: String(notes || "").trim(),
      createdBy: req.userId || null,
      updatedBy: req.userId || null,
    });

    let invoiceSync = null;

    if (status === "completed") {
      invoiceSync =
        await syncInvoicePayment(invoice);
    }

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate(
          "customerId",
          "name displayName companyName email phone"
        )
        .populate(
          "invoiceId",
          "invoiceNumber grandTotal paidAmount balanceAmount paymentStatus status"
        )
        .populate(
          "branchId",
          "name code"
        )
        .lean();

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: populatedPayment,
      invoicePayment: invoiceSync,
    });
  } catch (error) {
    console.error(
      "createPayment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PAYMENTS
|--------------------------------------------------------------------------
*/

const getPayments = async (req, res) => {
  try {
    const company = await getCompany(req);

    const {
      page = 1,
      limit = 20,
      search = "",
      status,
      paymentMethod,
      customerId,
      invoiceId,
      branchId,
      dateFrom,
      dateTo,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const currentLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {
      companyId: company._id,
      deletedAt: null,
    };

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (customerId) {
      validateObjectId(
        customerId,
        "customer ID"
      );
      filter.customerId = customerId;
    }

    if (invoiceId) {
      validateObjectId(
        invoiceId,
        "invoice ID"
      );
      filter.invoiceId = invoiceId;
    }

    if (branchId) {
      validateObjectId(
        branchId,
        "branch ID"
      );
      filter.branchId = branchId;
    }

    if (dateFrom || dateTo) {
      filter.paymentDate = {};

      if (dateFrom) {
        filter.paymentDate.$gte =
          new Date(`${dateFrom}T00:00:00.000Z`);
      }

      if (dateTo) {
        filter.paymentDate.$lte =
          new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    if (search.trim()) {
      const regex = new RegExp(
        search.trim(),
        "i"
      );

      const matchingCustomers =
        await Customer.find({
          companyId: req.companyId,
          $or: [
            { name: regex },
            { displayName: regex },
            { companyName: regex },
            { email: regex },
          ],
        })
          .select("_id")
          .lean();

      const customerIds =
        matchingCustomers.map(
          (customer) => customer._id
        );

      filter.$or = [
        { paymentNumber: regex },
        { referenceNumber: regex },
        { notes: regex },
        {
          customerId: {
            $in: customerIds,
          },
        },
      ];
    }

    const skip =
      (currentPage - 1) * currentLimit;

    const [payments, total] =
      await Promise.all([
        Payment.find(filter)
          .populate(
            "customerId",
            "name displayName companyName email phone"
          )
          .populate(
            "invoiceId",
            "invoiceNumber grandTotal paidAmount balanceAmount paymentStatus status"
          )
          .populate(
            "branchId",
            "name code"
          )
          .sort({
            paymentDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(currentLimit)
          .lean(),

        Payment.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      data: payments,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(
          total / currentLimit
        ),
      },
    });
  } catch (error) {
    console.error(
      "getPayments error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch payments",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE PAYMENT
|--------------------------------------------------------------------------
*/

const getPaymentById = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "payment ID"
    );

    const payment =
      await Payment.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      })
        .populate(
          "customerId",
          "name displayName companyName email phone gstin gstNumber"
        )
        .populate(
          "invoiceId",
          "invoiceNumber invoiceDate dueDate grandTotal paidAmount balanceAmount paymentStatus status"
        )
        .populate(
          "branchId",
          "name code address"
        )
        .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(
      "getPaymentById error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PAYMENT
|--------------------------------------------------------------------------
*/

const updatePayment = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "payment ID"
    );

    const payment =
      await Payment.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending payments can be edited",
      });
    }

    const {
      branchId,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
      amount,
    } = req.body || {};

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than 0",
        });
      }

      payment.amount =
        roundAmount(numericAmount);

      payment.remainingAmount =
        roundAmount(numericAmount);
    }

    if (branchId !== undefined) {
      const branch = await getBranch(
        branchId,
        company._id
      );

      payment.branchId =
        branch?._id || null;
    }

    if (paymentDate !== undefined) {
      payment.paymentDate =
        new Date(paymentDate);
    }

    if (paymentMethod !== undefined) {
      payment.paymentMethod =
        paymentMethod;
    }

    if (referenceNumber !== undefined) {
      payment.referenceNumber =
        String(referenceNumber || "").trim();
    }

    if (notes !== undefined) {
      payment.notes =
        String(notes || "").trim();
    }

    payment.updatedBy =
      req.userId || null;

    await payment.save();

    return res.json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
    });
  } catch (error) {
    console.error(
      "updatePayment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL PAYMENT
|--------------------------------------------------------------------------
*/

const cancelPayment = async (req, res) => {
  const session =
    await mongoose.startSession();

  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "payment ID"
    );

    let result;

    await session.withTransaction(
      async () => {
        const payment =
          await Payment.findOne({
            _id: req.params.id,
            companyId: company._id,
            deletedAt: null,
          }).session(session);

        if (!payment) {
          throw new Error(
            "Payment not found"
          );
        }

        if (
          ["cancelled", "refunded"].includes(
            payment.status
          )
        ) {
          throw new Error(
            `Payment is already ${payment.status}`
          );
        }

        const invoice =
          await Invoice.findOne({
            _id: payment.invoiceId,
            companyId: company._id,
            deletedAt: null,
          }).session(session);

        if (!invoice) {
          throw new Error(
            "Related invoice not found"
          );
        }

        payment.status = "cancelled";
        payment.cancelledAt = new Date();
        payment.cancelledBy =
          req.userId || null;
        payment.cancellationReason =
          String(
            req.body?.reason || ""
          ).trim();
        payment.updatedBy =
          req.userId || null;

        await payment.save({
          session,
        });

        const invoiceSync =
          await syncInvoicePayment(
            invoice,
            session
          );

        result = {
          payment,
          invoicePayment:
            invoiceSync,
        };
      }
    );

    return res.json({
      success: true,
      message:
        "Payment cancelled successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "cancelPayment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel payment",
    });
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| REFUND PAYMENT
|--------------------------------------------------------------------------
*/

const refundPayment = async (req, res) => {
  const session =
    await mongoose.startSession();

  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "payment ID"
    );

    let result;

    await session.withTransaction(
      async () => {
        const payment =
          await Payment.findOne({
            _id: req.params.id,
            companyId: company._id,
            deletedAt: null,
          }).session(session);

        if (!payment) {
          throw new Error(
            "Payment not found"
          );
        }

        if (payment.status !== "completed") {
          throw new Error(
            "Only completed payments can be refunded"
          );
        }

        const invoice =
          await Invoice.findOne({
            _id: payment.invoiceId,
            companyId: company._id,
            deletedAt: null,
          }).session(session);

        if (!invoice) {
          throw new Error(
            "Related invoice not found"
          );
        }

        payment.status = "refunded";
        payment.refundedAt = new Date();
        payment.refundedBy =
          req.userId || null;
        payment.refundReason =
          String(
            req.body?.reason || ""
          ).trim();
        payment.updatedBy =
          req.userId || null;

        await payment.save({
          session,
        });

        const invoiceSync =
          await syncInvoicePayment(
            invoice,
            session
          );

        result = {
          payment,
          invoicePayment:
            invoiceSync,
        };
      }
    );

    return res.json({
      success: true,
      message:
        "Payment refunded successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "refundPayment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to refund payment",
    });
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| DELETE PAYMENT
|--------------------------------------------------------------------------
*/

const deletePayment = async (req, res) => {
  try {
    const company = await getCompany(req);

    validateObjectId(
      req.params.id,
      "payment ID"
    );

    const payment =
      await Payment.findOne({
        _id: req.params.id,
        companyId: company._id,
        deletedAt: null,
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (
      payment.status === "completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Completed payment cannot be deleted. Use cancel or refund.",
      });
    }

    payment.deletedAt = new Date();
    payment.deletedBy =
      req.userId || null;
    payment.updatedBy =
      req.userId || null;

    await payment.save();

    return res.json({
      success: true,
      message:
        "Payment deleted successfully",
    });
  } catch (error) {
    console.error(
      "deletePayment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to delete payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PAYMENT SUMMARY
|--------------------------------------------------------------------------
*/

const getPaymentSummary = async (
  req,
  res
) => {
  try {
    const company = await getCompany(req);

    const {
      dateFrom,
      dateTo,
      branchId,
      customerId,
    } = req.query;

    const match = {
      companyId: company._id,
      deletedAt: null,
    };

    if (branchId) {
      validateObjectId(
        branchId,
        "branch ID"
      );

      match.branchId = new mongoose.Types.ObjectId(
        branchId
      );
    }

    if (customerId) {
      validateObjectId(
        customerId,
        "customer ID"
      );

      match.customerId =
        new mongoose.Types.ObjectId(
          customerId
        );
    }

    if (dateFrom || dateTo) {
      match.paymentDate = {};

      if (dateFrom) {
        match.paymentDate.$gte =
          new Date(
            `${dateFrom}T00:00:00.000Z`
          );
      }

      if (dateTo) {
        match.paymentDate.$lte =
          new Date(
            `${dateTo}T23:59:59.999Z`
          );
      }
    }

    const aggregation =
      await Payment.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$amount",
            },
          },
        },
      ]);

    const summary = {
      totalPayments: 0,
      totalAmount: 0,

      completedPayments: 0,
      completedAmount: 0,

      pendingPayments: 0,
      pendingAmount: 0,

      cancelledPayments: 0,
      cancelledAmount: 0,

      refundedPayments: 0,
      refundedAmount: 0,
    };

    aggregation.forEach((item) => {
      const count =
        Number(item.count || 0);

      const amount = roundAmount(
        Number(item.amount || 0)
      );

      summary.totalPayments += count;
      summary.totalAmount += amount;

      if (item._id === "completed") {
        summary.completedPayments += count;
        summary.completedAmount += amount;
      }

      if (item._id === "pending") {
        summary.pendingPayments += count;
        summary.pendingAmount += amount;
      }

      if (item._id === "cancelled") {
        summary.cancelledPayments += count;
        summary.cancelledAmount += amount;
      }

      if (item._id === "refunded") {
        summary.refundedPayments += count;
        summary.refundedAmount += amount;
      }
    });

    summary.totalAmount =
      roundAmount(summary.totalAmount);

    summary.completedAmount =
      roundAmount(
        summary.completedAmount
      );

    summary.pendingAmount =
      roundAmount(
        summary.pendingAmount
      );

    summary.cancelledAmount =
      roundAmount(
        summary.cancelledAmount
      );

    summary.refundedAmount =
      roundAmount(
        summary.refundedAmount
      );

    const todayStart = new Date();
    todayStart.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow = new Date(
      todayStart
    );

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const monthStart = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      1
    );

    const [
      todayResult,
      monthResult,
    ] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
            status: "completed",
            paymentDate: {
              $gte: todayStart,
              $lt: tomorrow,
            },
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            companyId: company._id,
            deletedAt: null,
            status: "completed",
            paymentDate: {
              $gte: monthStart,
              $lt: tomorrow,
            },
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    summary.todayPayments =
      todayResult[0]?.count || 0;

    summary.todayAmount =
      roundAmount(
        todayResult[0]?.amount || 0
      );

    summary.monthPayments =
      monthResult[0]?.count || 0;

    summary.monthAmount =
      roundAmount(
        monthResult[0]?.amount || 0
      );

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error(
      "getPaymentSummary error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch payment summary",
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  cancelPayment,
  refundPayment,
  getPaymentSummary,
};