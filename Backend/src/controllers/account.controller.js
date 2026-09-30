const mongoose = require("mongoose");
const Account = require("../models/Account");

const ACCOUNT_TYPES = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
];

const NORMAL_BALANCE = {
  asset: "debit",
  expense: "debit",
  liability: "credit",
  equity: "credit",
  income: "credit",
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getCompanyId = (req) => {
  if (!req.companyId || !isValidId(req.companyId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(req.companyId);
};

const normalizeCode = (value) =>
  String(value || "").trim().toUpperCase();

const normalizeName = (value) =>
  String(value || "").trim();

const validateType = (type) =>
  ACCOUNT_TYPES.includes(type);

const validateParent = async ({
  parentAccountId,
  companyId,
  accountId = null,
}) => {
  if (!parentAccountId) return null;

  if (!isValidId(parentAccountId)) {
    const error = new Error("Invalid parent account ID");
    error.statusCode = 400;
    throw error;
  }

  if (accountId && String(parentAccountId) === String(accountId)) {
    const error = new Error(
      "An account cannot be its own parent"
    );
    error.statusCode = 400;
    throw error;
  }

  const parent = await Account.findOne({
    _id: parentAccountId,
    companyId,
    deletedAt: null,
    isActive: true,
  });

  if (!parent) {
    const error = new Error(
      "Parent account not found in your company"
    );
    error.statusCode = 400;
    throw error;
  }

  return parent;
};

const createAccount = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    const {
      code,
      name,
      description,
      type,
      subType,
      parentAccountId,
      openingBalance,
      openingBalanceType,
      currency,
      isCashAccount,
      isBankAccount,
      isTaxAccount,
      sortOrder,
    } = req.body;

    const normalizedCode = normalizeCode(code);
    const normalizedName = normalizeName(name);

    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "Account code is required",
      });
    }

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Account name is required",
      });
    }

    if (!validateType(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid account type. Allowed values: ${ACCOUNT_TYPES.join(
          ", "
        )}`,
      });
    }

    if (
      openingBalanceType &&
      !["debit", "credit"].includes(openingBalanceType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance type",
      });
    }

    const existing = await Account.findOne({
      companyId,
      code: normalizedCode,
      deletedAt: null,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists",
      });
    }

    await validateParent({
      parentAccountId,
      companyId,
    });

    const balance = Number(openingBalance || 0);

    if (!Number.isFinite(balance) || balance < 0) {
      return res.status(400).json({
        success: false,
        message: "Opening balance must be a valid positive number",
      });
    }

    const account = await Account.create({
      companyId,
      branchId: null,
      code: normalizedCode,
      name: normalizedName,
      description: String(description || "").trim(),
      type,
      subType: String(subType || "").trim(),
      parentAccountId: parentAccountId || null,
      normalBalance: NORMAL_BALANCE[type],
      openingBalance: balance,
      openingBalanceType: openingBalanceType || NORMAL_BALANCE[type],
      currentBalance:
        (openingBalanceType || NORMAL_BALANCE[type]) === "debit"
          ? balance
          : -balance,
      currency: String(currency || "INR")
        .trim()
        .toUpperCase(),
      isCashAccount: Boolean(isCashAccount),
      isBankAccount: Boolean(isBankAccount),
      isTaxAccount: Boolean(isTaxAccount),
      sortOrder: Number(sortOrder || 0),
      createdBy: req.userId || null,
      updatedBy: req.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists",
      });
    }

    next(error);
  }
};

const getAccounts = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    const {
      search = "",
      type,
      isActive,
      parentAccountId,
      page = 1,
      limit = 50,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const filter = {
      companyId,
      deletedAt: null,
    };

    if (type) {
      if (!validateType(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account type",
        });
      }

      filter.type = type;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (parentAccountId === "null") {
      filter.parentAccountId = null;
    } else if (parentAccountId) {
      if (!isValidId(parentAccountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent account ID",
        });
      }

      filter.parentAccountId = parentAccountId;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { code: regex },
        { name: regex },
        { description: regex },
        { subType: regex },
      ];
    }

    const skip = (currentPage - 1) * perPage;

    const [accounts, total] = await Promise.all([
      Account.find(filter)
        .populate("parentAccountId", "code name type")
        .sort({
          type: 1,
          sortOrder: 1,
          code: 1,
        })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Account.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: accounts,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAccountById = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    })
      .populate("parentAccountId", "code name type")
      .lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (account.isSystemAccount) {
      return res.status(400).json({
        success: false,
        message: "System accounts cannot be modified",
      });
    }

    const {
      code,
      name,
      description,
      type,
      subType,
      parentAccountId,
      openingBalance,
      openingBalanceType,
      currency,
      isCashAccount,
      isBankAccount,
      isTaxAccount,
      isActive,
      sortOrder,
    } = req.body;

    if (code !== undefined) {
      const normalizedCode = normalizeCode(code);

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Account code cannot be empty",
        });
      }

      const duplicate = await Account.findOne({
        companyId,
        code: normalizedCode,
        deletedAt: null,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Account code already exists",
        });
      }

      account.code = normalizedCode;
    }

    if (name !== undefined) {
      const normalizedName = normalizeName(name);

      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: "Account name cannot be empty",
        });
      }

      account.name = normalizedName;
    }

    if (description !== undefined) {
      account.description = String(description).trim();
    }

    if (type !== undefined) {
      if (!validateType(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account type",
        });
      }

      account.type = type;
      account.normalBalance = NORMAL_BALANCE[type];
    }

    if (subType !== undefined) {
      account.subType = String(subType).trim();
    }

    if (parentAccountId !== undefined) {
      await validateParent({
        parentAccountId,
        companyId,
        accountId: id,
      });

      account.parentAccountId = parentAccountId || null;
    }

    if (openingBalance !== undefined) {
      const balance = Number(openingBalance);

      if (!Number.isFinite(balance) || balance < 0) {
        return res.status(400).json({
          success: false,
          message: "Opening balance must be a valid positive number",
        });
      }

      account.openingBalance = balance;

      const balanceType =
        openingBalanceType ||
        account.openingBalanceType ||
        account.normalBalance;

      account.openingBalanceType = balanceType;

      account.currentBalance =
        balanceType === "debit" ? balance : -balance;
    }

    if (openingBalanceType !== undefined) {
      if (!["debit", "credit"].includes(openingBalanceType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid opening balance type",
        });
      }

      account.openingBalanceType = openingBalanceType;
    }

    if (currency !== undefined) {
      account.currency = String(currency)
        .trim()
        .toUpperCase();
    }

    if (isCashAccount !== undefined) {
      account.isCashAccount = Boolean(isCashAccount);
    }

    if (isBankAccount !== undefined) {
      account.isBankAccount = Boolean(isBankAccount);
    }

    if (isTaxAccount !== undefined) {
      account.isTaxAccount = Boolean(isTaxAccount);
    }

    if (isActive !== undefined) {
      account.isActive = Boolean(isActive);
    }

    if (sortOrder !== undefined) {
      account.sortOrder = Number(sortOrder) || 0;
    }

    account.updatedBy = req.userId || null;

    await account.save();

    return res.json({
      success: true,
      message: "Account updated successfully",
      data: account,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists",
      });
    }

    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (account.isSystemAccount) {
      return res.status(400).json({
        success: false,
        message: "System accounts cannot be deleted",
      });
    }

    const childAccount = await Account.exists({
      companyId,
      parentAccountId: id,
      deletedAt: null,
    });

    if (childAccount) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete an account that has child accounts",
      });
    }

    account.deletedAt = new Date();
    account.deletedBy = req.userId || null;
    account.isActive = false;
    account.updatedBy = req.userId || null;

    await account.save();

    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getAccountSummary = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    const summary = await Account.aggregate([
      {
        $match: {
          companyId,
          deletedAt: null,
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          balance: { $sum: "$currentBalance" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const totals = {
      accounts: 0,
      balance: 0,
      asset: 0,
      liability: 0,
      equity: 0,
      income: 0,
      expense: 0,
    };

    summary.forEach((item) => {
      totals.accounts += item.count;
      totals[item._id] = item.balance;
      totals.balance += item.balance;
    });

    return res.json({
      success: true,
      data: {
        totals,
        byType: summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountSummary,
};