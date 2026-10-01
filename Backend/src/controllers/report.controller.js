"use strict";

const mongoose = require("mongoose");
const httpError = require("../utils/httpError");

// ============================================================
// LOCAL ASYNC HANDLER
// ============================================================

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// ============================================================
// MODELS
// IMPORTANT: filenames match actual Linux filesystem
// ============================================================

const Company = require("../models/Company");
const Customer = require("../models/Customer");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Purchase = require("../models/purchase.model");
const Sale = require("../models/sales");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Workflow = require("../models/Workflow");
const WorkflowInstance = require("../models/WorkflowInstance");

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const getWorkspaceId = (req) => {
  if (!req.companyId) {
    throw httpError(401, "Company context is missing");
  }

  if (!isValidObjectId(req.companyId)) {
    throw httpError(400, "Invalid company context");
  }

  return new mongoose.Types.ObjectId(req.companyId);
};

/*
  Your ERP currently has two company ID patterns:

  1. Some modules store JWT workspace/company ID directly.
  2. Some modules store actual Company._id.

  Both IDs belong to the authenticated workspace.

  Therefore reports use both IDs in a tenant-safe $in query.
*/

const getTenantCompanyIds = async (req) => {
  const workspaceId = getWorkspaceId(req);

  const company = await Company.findOne({
    workspaceId,
    status: "active",
  })
    .select("_id workspaceId status")
    .lean();

  const ids = [workspaceId];

  if (company?._id) {
    const actualCompanyId = new mongoose.Types.ObjectId(company._id);

    if (!ids.some((id) => id.equals(actualCompanyId))) {
      ids.push(actualCompanyId);
    }
  }

  return ids;
};

const tenantMatch = (companyIds) => ({
  companyId: { $in: companyIds },
});

const getDateRange = (req) => {
  const now = new Date();

  const from = req.query.from
    ? new Date(`${req.query.from}T00:00:00.000`)
    : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const to = req.query.to
    ? new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)
          ? `${req.query.to}T23:59:59.999`
          : req.query.to
      )
    : now;

  if (Number.isNaN(from.getTime())) {
    throw httpError(400, "Invalid from date");
  }

  if (Number.isNaN(to.getTime())) {
    throw httpError(400, "Invalid to date");
  }

  if (from > to) {
    throw httpError(400, "From date cannot be after to date");
  }

  return {
    from,
    to,
  };
};

const createdDateMatch = (from, to) => ({
  createdAt: {
    $gte: from,
    $lte: to,
  },
});

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const sendSuccess = (
  res,
  data,
  message = "Report generated successfully"
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

// ============================================================
// OVERVIEW
// GET /api/reports/overview
// ============================================================

exports.getOverview = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const baseTenantMatch = tenantMatch(companyIds);

  const [
    customers,
    vendors,
    products,
    inventory,
    projects,
    tasks,
    workflows,
    workflowInstances,
  ] = await Promise.all([
    Customer.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    Vendor.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    Product.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    Inventory.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    Project.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    Task.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    Workflow.countDocuments({
      ...baseTenantMatch,
      deletedAt: null,
    }),

    WorkflowInstance.countDocuments({
      ...baseTenantMatch,
      ...createdDateMatch(from, to),
    }),
  ]);

  const [
    purchaseSummary,
    projectSummary,
    taskSummary,
    workflowSummary,
  ] = await Promise.all([
    Purchase.aggregate([
      {
        $match: {
          ...baseTenantMatch,
          deletedAt: null,
          ...createdDateMatch(from, to),
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: {
            $sum: {
              $ifNull: [
                "$grandTotal",
                {
                  $ifNull: [
                    "$totalAmount",
                    {
                      $ifNull: ["$netTotal", 0],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    ]),

    Project.aggregate([
      {
        $match: {
          ...baseTenantMatch,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          budget: {
            $sum: {
              $ifNull: ["$budget", 0],
            },
          },
          actualCost: {
            $sum: {
              $ifNull: ["$actualCost", 0],
            },
          },
          revenue: {
            $sum: {
              $ifNull: ["$revenue", 0],
            },
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),

    Task.aggregate([
      {
        $match: {
          ...baseTenantMatch,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),

    WorkflowInstance.aggregate([
      {
        $match: {
          ...baseTenantMatch,
          ...createdDateMatch(from, to),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),
  ]);

  const projectStats = {};

  projectSummary.forEach((item) => {
    projectStats[item._id || "unknown"] = {
      count: safeNumber(item.count),
      budget: safeNumber(item.budget),
      actualCost: safeNumber(item.actualCost),
      revenue: safeNumber(item.revenue),
    };
  });

  const taskStats = {};

  taskSummary.forEach((item) => {
    taskStats[item._id || "unknown"] = safeNumber(item.count);
  });

  const workflowStats = {};

  workflowSummary.forEach((item) => {
    workflowStats[item._id || "unknown"] = safeNumber(item.count);
  });

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    masterData: {
      customers,
      vendors,
      products,
      inventory,
      projects,
      tasks,
      workflows,
    },

    workflowInstances,

    purchases: {
      count: safeNumber(purchaseSummary[0]?.count),
      total: safeNumber(purchaseSummary[0]?.total),
    },

    projects: projectStats,

    tasks: taskStats,

    workflows: workflowStats,

    generatedAt: new Date(),
  });
});

// ============================================================
// SALES REPORT
// GET /api/reports/sales
// ============================================================

exports.getSalesReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const match = {
    ...tenantMatch(companyIds),
    ...createdDateMatch(from, to),
  };

  if ("deletedAt" in Sale.schema.paths) {
    match.deletedAt = null;
  }

  const [summary, statusBreakdown, monthly] =
    await Promise.all([
      Sale.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: [
                      "$totalAmount",
                      {
                        $ifNull: ["$total", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),

      Sale.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              $ifNull: ["$status", "unknown"],
            },
            count: { $sum: 1 },
            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: [
                      "$totalAmount",
                      {
                        $ifNull: ["$total", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Sale.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: [
                      "$totalAmount",
                      {
                        $ifNull: ["$total", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),
    ]);

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    count: safeNumber(summary[0]?.count),

    total: safeNumber(summary[0]?.total),

    statusBreakdown,

    monthly,
  });
});

// ============================================================
// PURCHASE REPORT
// GET /api/reports/purchases
// ============================================================

exports.getPurchaseReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const match = {
    ...tenantMatch(companyIds),
    deletedAt: null,
    ...createdDateMatch(from, to),
  };

  const [summary, statusBreakdown, monthly] =
    await Promise.all([
      Purchase.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: [
                      "$totalAmount",
                      {
                        $ifNull: ["$netTotal", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),

      Purchase.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              $ifNull: ["$status", "unknown"],
            },
            count: { $sum: 1 },
            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: [
                      "$totalAmount",
                      {
                        $ifNull: ["$netTotal", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Purchase.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: [
                      "$totalAmount",
                      {
                        $ifNull: ["$netTotal", 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),
    ]);

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    count: safeNumber(summary[0]?.count),

    total: safeNumber(summary[0]?.total),

    statusBreakdown,

    monthly,
  });
});

// ============================================================
// INVOICE REPORT
// GET /api/reports/invoices
// ============================================================

exports.getInvoiceReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const match = {
    ...tenantMatch(companyIds),
    deletedAt: null,
    ...createdDateMatch(from, to),
  };

  const [summary, statusBreakdown] =
    await Promise.all([
      Invoice.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },

            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: ["$total", 0],
                  },
                ],
              },
            },

            paid: {
              $sum: {
                $ifNull: [
                  "$amountPaid",
                  {
                    $ifNull: ["$paidAmount", 0],
                  },
                ],
              },
            },

            outstanding: {
              $sum: {
                $ifNull: [
                  "$balanceDue",
                  {
                    $ifNull: ["$outstandingAmount", 0],
                  },
                ],
              },
            },
          },
        },
      ]),

      Invoice.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              $ifNull: ["$status", "unknown"],
            },

            count: {
              $sum: 1,
            },

            total: {
              $sum: {
                $ifNull: [
                  "$grandTotal",
                  {
                    $ifNull: ["$total", 0],
                  },
                ],
              },
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

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    count: safeNumber(summary[0]?.count),

    total: safeNumber(summary[0]?.total),

    paid: safeNumber(summary[0]?.paid),

    outstanding: safeNumber(summary[0]?.outstanding),

    statusBreakdown,
  });
});

// ============================================================
// PAYMENT REPORT
// GET /api/reports/payments
// ============================================================

exports.getPaymentReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const match = {
    ...tenantMatch(companyIds),
    ...createdDateMatch(from, to),
  };

  if ("deletedAt" in Payment.schema.paths) {
    match.deletedAt = null;
  }

  const amountExpression = {
    $ifNull: [
      "$amount",
      {
        $ifNull: ["$paidAmount", 0],
      },
    ],
  };

  const [summary, methodBreakdown] =
    await Promise.all([
      Payment.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: {
              $sum: amountExpression,
            },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              $ifNull: [
                "$paymentMethod",
                {
                  $ifNull: [
                    "$method",
                    "unknown",
                  ],
                },
              ],
            },

            count: {
              $sum: 1,
            },

            total: {
              $sum: amountExpression,
            },
          },
        },
        {
          $sort: {
            total: -1,
          },
        },
      ]),
    ]);

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    count: safeNumber(summary[0]?.count),

    total: safeNumber(summary[0]?.total),

    methodBreakdown,
  });
});

// ============================================================
// EXPENSE REPORT
// GET /api/reports/expenses
// ============================================================

exports.getExpenseReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const match = {
    ...tenantMatch(companyIds),
    ...createdDateMatch(from, to),
  };

  if ("deletedAt" in Expense.schema.paths) {
    match.deletedAt = null;
  }

  const amountExpression = {
    $ifNull: [
      "$amount",
      {
        $ifNull: ["$totalAmount", 0],
      },
    ],
  };

  const [summary, categoryBreakdown] =
    await Promise.all([
      Expense.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: {
              $sum: amountExpression,
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              $ifNull: [
                "$category",
                {
                  $ifNull: [
                    "$expenseCategory",
                    "Other",
                  ],
                },
              ],
            },

            count: {
              $sum: 1,
            },

            total: {
              $sum: amountExpression,
            },
          },
        },
        {
          $sort: {
            total: -1,
          },
        },
      ]),
    ]);

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    count: safeNumber(summary[0]?.count),

    total: safeNumber(summary[0]?.total),

    categoryBreakdown,
  });
});

// ============================================================
// INVENTORY REPORT
// GET /api/reports/inventory
// ============================================================

exports.getInventoryReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);

  const match = {
    ...tenantMatch(companyIds),
    deletedAt: null,
  };

  const quantityExpression = {
    $ifNull: [
      "$quantity",
      {
        $ifNull: ["$currentStock", 0],
      },
    ],
  };

  const costExpression = {
    $ifNull: [
      "$costPrice",
      {
        $ifNull: ["$unitCost", 0],
      },
    ],
  };

  const [summary, byStatus] =
    await Promise.all([
      Inventory.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,

            count: {
              $sum: 1,
            },

            quantity: {
              $sum: quantityExpression,
            },

            value: {
              $sum: {
                $multiply: [
                  quantityExpression,
                  costExpression,
                ],
              },
            },
          },
        },
      ]),

      Inventory.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              $ifNull: ["$status", "unknown"],
            },

            count: {
              $sum: 1,
            },

            quantity: {
              $sum: quantityExpression,
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

  return sendSuccess(res, {
    count: safeNumber(summary[0]?.count),

    quantity: safeNumber(summary[0]?.quantity),

    value: safeNumber(summary[0]?.value),

    statusBreakdown: byStatus,
  });
});

// ============================================================
// CUSTOMER REPORT
// GET /api/reports/customers
// ============================================================

exports.getCustomerReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);

  const baseMatch = {
    ...tenantMatch(companyIds),
    deletedAt: null,
  };

  const [total, active, inactive] =
    await Promise.all([
      Customer.countDocuments(baseMatch),

      Customer.countDocuments({
        ...baseMatch,
        status: "active",
      }),

      Customer.countDocuments({
        ...baseMatch,
        status: "inactive",
      }),
    ]);

  return sendSuccess(res, {
    total,
    active,
    inactive,
  });
});

// ============================================================
// VENDOR REPORT
// GET /api/reports/vendors
// ============================================================

exports.getVendorReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);

  const baseMatch = {
    ...tenantMatch(companyIds),
    deletedAt: null,
  };

  const [total, active, inactive] =
    await Promise.all([
      Vendor.countDocuments(baseMatch),

      Vendor.countDocuments({
        ...baseMatch,
        status: "active",
      }),

      Vendor.countDocuments({
        ...baseMatch,
        status: "inactive",
      }),
    ]);

  return sendSuccess(res, {
    total,
    active,
    inactive,
  });
});

// ============================================================
// PROJECT REPORT
// GET /api/reports/projects
// ============================================================

exports.getProjectReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);

  const data = await Project.aggregate([
    {
      $match: {
        ...tenantMatch(companyIds),
        deletedAt: null,
      },
    },

    {
      $group: {
        _id: {
          $ifNull: ["$status", "unknown"],
        },

        count: {
          $sum: 1,
        },

        budget: {
          $sum: {
            $ifNull: ["$budget", 0],
          },
        },

        actualCost: {
          $sum: {
            $ifNull: ["$actualCost", 0],
          },
        },

        revenue: {
          $sum: {
            $ifNull: ["$revenue", 0],
          },
        },
      },
    },

    {
      $sort: {
        count: -1,
      },
    },
  ]);

  return sendSuccess(res, {
    statuses: data,
  });
});

// ============================================================
// TASK REPORT
// GET /api/reports/tasks
// ============================================================

exports.getTaskReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);

  const data = await Task.aggregate([
    {
      $match: {
        ...tenantMatch(companyIds),
        deletedAt: null,
      },
    },

    {
      $group: {
        _id: {
          $ifNull: ["$status", "unknown"],
        },

        count: {
          $sum: 1,
        },

        estimatedHours: {
          $sum: {
            $ifNull: ["$estimatedHours", 0],
          },
        },

        actualHours: {
          $sum: {
            $ifNull: ["$actualHours", 0],
          },
        },
      },
    },

    {
      $sort: {
        count: -1,
      },
    },
  ]);

  return sendSuccess(res, {
    statuses: data,
  });
});

// ============================================================
// WORKFLOW REPORT
// GET /api/reports/workflows
// ============================================================

exports.getWorkflowReport = asyncHandler(async (req, res) => {
  const companyIds = await getTenantCompanyIds(req);
  const { from, to } = getDateRange(req);

  const baseTenantMatch = tenantMatch(companyIds);

  const [workflowStatuses, instanceStatuses, entityTypes] =
    await Promise.all([
      Workflow.aggregate([
        {
          $match: {
            ...baseTenantMatch,
            deletedAt: null,
          },
        },

        {
          $group: {
            _id: {
              $ifNull: ["$status", "unknown"],
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      WorkflowInstance.aggregate([
        {
          $match: {
            ...baseTenantMatch,
            ...createdDateMatch(from, to),
          },
        },

        {
          $group: {
            _id: {
              $ifNull: ["$status", "unknown"],
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      WorkflowInstance.aggregate([
        {
          $match: {
            ...baseTenantMatch,
            ...createdDateMatch(from, to),
          },
        },

        {
          $group: {
            _id: {
              $ifNull: ["$entityType", "unknown"],
            },

            count: {
              $sum: 1,
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

  return sendSuccess(res, {
    period: {
      from,
      to,
    },

    workflows: workflowStatuses,

    instances: instanceStatuses,

    entityTypes,
  });
});