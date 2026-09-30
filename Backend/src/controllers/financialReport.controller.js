const mongoose = require("mongoose");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");

const getCompanyId = (req) => {
  if (!req.companyId || !mongoose.Types.ObjectId.isValid(req.companyId)) {
    throw new Error("Invalid company context");
  }

  return new mongoose.Types.ObjectId(req.companyId);
};

const parseDate = (value, fallback) => {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
};

const getDateRange = (req) => {
  const now = new Date();

  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const defaultTo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const from = parseDate(req.query.from, defaultFrom);
  const to = parseDate(req.query.to, defaultTo);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (from > to) {
    throw new Error("From date cannot be greater than To date");
  }

  return { from, to };
};

const getAccountMap = async (companyId) => {
  const accounts = await Account.find({
    companyId,
    deletedAt: null,
  })
    .select(
      "_id code name type subType parentAccountId normalBalance currentBalance currency isActive"
    )
    .sort({ code: 1 })
    .lean();

  return new Map(accounts.map((account) => [String(account._id), account]));
};

const getPostedEntries = async (companyId, from, to) => {
  return JournalEntry.find({
    companyId,
    status: "posted",
    deletedAt: null,
    journalDate: {
      $gte: from,
      $lte: to,
    },
  })
    .select(
      "_id journalNumber journalDate description entryType referenceNumber lines totalDebit totalCredit"
    )
    .sort({ journalDate: 1, journalNumber: 1 })
    .lean();
};

/**
 * Trial Balance
 *
 * Shows debit / credit balance of every account
 * for the selected period.
 */
const getTrialBalance = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { from, to } = getDateRange(req);

    const [accounts, entries] = await Promise.all([
      Account.find({
        companyId,
        deletedAt: null,
      })
        .select(
          "_id code name type subType normalBalance openingBalance openingBalanceType currency isActive"
        )
        .sort({ code: 1 })
        .lean(),

      getPostedEntries(companyId, from, to),
    ]);

    const balances = new Map();

    accounts.forEach((account) => {
      const openingDebit =
        account.openingBalanceType === "debit"
          ? Number(account.openingBalance || 0)
          : 0;

      const openingCredit =
        account.openingBalanceType === "credit"
          ? Number(account.openingBalance || 0)
          : 0;

      balances.set(String(account._id), {
        debit: openingDebit,
        credit: openingCredit,
      });
    });

    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const accountId = String(line.accountId);

        if (!balances.has(accountId)) {
          balances.set(accountId, {
            debit: 0,
            credit: 0,
          });
        }

        const balance = balances.get(accountId);

        balance.debit += Number(line.debit || 0);
        balance.credit += Number(line.credit || 0);
      });
    });

    const data = accounts.map((account) => {
      const balance = balances.get(String(account._id)) || {
        debit: 0,
        credit: 0,
      };

      const net = balance.debit - balance.credit;

      return {
        accountId: account._id,
        code: account.code,
        name: account.name,
        type: account.type,
        subType: account.subType,
        debit: Number(balance.debit.toFixed(2)),
        credit: Number(balance.credit.toFixed(2)),
        balance: Number(Math.abs(net).toFixed(2)),
        balanceType:
          net > 0 ? "debit" : net < 0 ? "credit" : "balanced",
        currency: account.currency || "INR",
      };
    });

    const totalDebit = data.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = data.reduce((sum, item) => sum + item.credit, 0);

    return res.json({
      success: true,
      data,
      totals: {
        debit: Number(totalDebit.toFixed(2)),
        credit: Number(totalCredit.toFixed(2)),
        difference: Number(
          Math.abs(totalDebit - totalCredit).toFixed(2)
        ),
      },
      period: {
        from,
        to,
      },
    });
  } catch (error) {
    console.error("Trial balance error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate trial balance",
    });
  }
};

/**
 * General Ledger
 *
 * Returns account-wise journal transactions.
 */
const getGeneralLedger = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { from, to } = getDateRange(req);

    const accountId = req.query.accountId;

    const accounts = await Account.find({
      companyId,
      deletedAt: null,
      ...(accountId
        ? { _id: new mongoose.Types.ObjectId(accountId) }
        : {}),
    })
      .select(
        "_id code name type subType normalBalance openingBalance openingBalanceType currency"
      )
      .sort({ code: 1 })
      .lean();

    const accountMap = new Map(
      accounts.map((account) => [String(account._id), account])
    );

    const entries = await getPostedEntries(companyId, from, to);

    const ledgerMap = new Map();

    accounts.forEach((account) => {
      const opening =
        account.openingBalanceType === "credit"
          ? -Number(account.openingBalance || 0)
          : Number(account.openingBalance || 0);

      ledgerMap.set(String(account._id), {
        account: {
          _id: account._id,
          code: account.code,
          name: account.name,
          type: account.type,
          subType: account.subType,
          currency: account.currency || "INR",
        },
        openingBalance: opening,
        transactions: [],
        debitTotal: 0,
        creditTotal: 0,
        closingBalance: opening,
      });
    });

    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const key = String(line.accountId);

        if (!ledgerMap.has(key)) return;

        const ledger = ledgerMap.get(key);

        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        const movement = debit - credit;

        ledger.debitTotal += debit;
        ledger.creditTotal += credit;
        ledger.closingBalance += movement;

        ledger.transactions.push({
          journalEntryId: entry._id,
          journalNumber: entry.journalNumber,
          journalDate: entry.journalDate,
          description:
            line.description || entry.description || "",
          entryType: entry.entryType,
          referenceNumber: entry.referenceNumber || null,
          debit,
          credit,
          balance: Number(ledger.closingBalance.toFixed(2)),
        });
      });
    });

    const data = Array.from(ledgerMap.values())
      .filter(
        (item) =>
          item.transactions.length > 0 ||
          Number(item.openingBalance) !== 0
      )
      .map((item) => ({
        ...item,
        openingBalance: Number(item.openingBalance.toFixed(2)),
        debitTotal: Number(item.debitTotal.toFixed(2)),
        creditTotal: Number(item.creditTotal.toFixed(2)),
        closingBalance: Number(item.closingBalance.toFixed(2)),
      }));

    return res.json({
      success: true,
      data,
      period: {
        from,
        to,
      },
    });
  } catch (error) {
    console.error("General ledger error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate general ledger",
    });
  }
};

/**
 * Profit & Loss
 *
 * Income - Expenses
 */
const getProfitAndLoss = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { from, to } = getDateRange(req);

    const [accounts, entries] = await Promise.all([
      Account.find({
        companyId,
        deletedAt: null,
      })
        .select("_id code name type subType currency")
        .sort({ code: 1 })
        .lean(),

      getPostedEntries(companyId, from, to),
    ]);

    const totals = new Map();

    accounts.forEach((account) => {
      totals.set(String(account._id), {
        debit: 0,
        credit: 0,
      });
    });

    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const accountId = String(line.accountId);

        if (!totals.has(accountId)) return;

        const accountTotal = totals.get(accountId);

        accountTotal.debit += Number(line.debit || 0);
        accountTotal.credit += Number(line.credit || 0);
      });
    });

    const income = [];
    const expenses = [];

    accounts.forEach((account) => {
      const total = totals.get(String(account._id));

      if (!total) return;

      let amount = 0;

      if (account.type === "income") {
        amount = total.credit - total.debit;

        if (amount !== 0) {
          income.push({
            accountId: account._id,
            code: account.code,
            name: account.name,
            subType: account.subType,
            amount: Number(amount.toFixed(2)),
            currency: account.currency || "INR",
          });
        }
      }

      if (account.type === "expense") {
        amount = total.debit - total.credit;

        if (amount !== 0) {
          expenses.push({
            accountId: account._id,
            code: account.code,
            name: account.name,
            subType: account.subType,
            amount: Number(amount.toFixed(2)),
            currency: account.currency || "INR",
          });
        }
      }
    });

    const totalIncome = income.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const netProfit = totalIncome - totalExpenses;

    return res.json({
      success: true,
      data: {
        income,
        expenses,
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        result: netProfit >= 0 ? "profit" : "loss",
        currency: "INR",
      },
      period: {
        from,
        to,
      },
    });
  } catch (error) {
    console.error("Profit and loss error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate profit and loss",
    });
  }
};

/**
 * Balance Sheet
 *
 * Assets = Liabilities + Equity
 */
const getBalanceSheet = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { to } = getDateRange(req);

    const [accounts, entries] = await Promise.all([
      Account.find({
        companyId,
        deletedAt: null,
      })
        .select(
          "_id code name type subType openingBalance openingBalanceType currency"
        )
        .sort({ code: 1 })
        .lean(),

      JournalEntry.find({
        companyId,
        status: "posted",
        deletedAt: null,
        journalDate: {
          $lte: to,
        },
      })
        .select("lines")
        .lean(),
    ]);

    const totals = new Map();

    accounts.forEach((account) => {
      const opening =
        account.openingBalanceType === "credit"
          ? -Number(account.openingBalance || 0)
          : Number(account.openingBalance || 0);

      totals.set(String(account._id), opening);
    });

    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const accountId = String(line.accountId);

        if (!totals.has(accountId)) return;

        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        totals.set(
          accountId,
          totals.get(accountId) + debit - credit
        );
      });
    });

    const assets = [];
    const liabilities = [];
    const equity = [];

    accounts.forEach((account) => {
      const rawBalance = totals.get(String(account._id)) || 0;

      let amount = 0;

      if (account.type === "asset") {
        amount = rawBalance;
      } else if (
        account.type === "liability" ||
        account.type === "equity"
      ) {
        amount = Math.abs(rawBalance);
      } else {
        return;
      }

      if (amount === 0) return;

      const item = {
        accountId: account._id,
        code: account.code,
        name: account.name,
        subType: account.subType,
        amount: Number(amount.toFixed(2)),
        currency: account.currency || "INR",
      };

      if (account.type === "asset") {
        assets.push(item);
      } else if (account.type === "liability") {
        liabilities.push(item);
      } else if (account.type === "equity") {
        equity.push(item);
      }
    });

    const totalAssets = assets.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const totalLiabilities = liabilities.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const totalEquity = equity.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return res.json({
      success: true,
      data: {
        assets,
        liabilities,
        equity,
        totalAssets: Number(totalAssets.toFixed(2)),
        totalLiabilities: Number(totalLiabilities.toFixed(2)),
        totalEquity: Number(totalEquity.toFixed(2)),
        liabilitiesAndEquity: Number(
          (totalLiabilities + totalEquity).toFixed(2)
        ),
        difference: Number(
          (
            totalAssets -
            (totalLiabilities + totalEquity)
          ).toFixed(2)
        ),
        currency: "INR",
      },
      period: {
        to,
      },
    });
  } catch (error) {
    console.error("Balance sheet error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate balance sheet",
    });
  }
};

/**
 * Account Ledger
 *
 * Detailed ledger for one account.
 */
const getAccountLedger = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { from, to } = getDateRange(req);

    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findOne({
      _id: accountId,
      companyId,
      deletedAt: null,
    })
      .select(
        "_id code name type subType normalBalance openingBalance openingBalanceType currency"
      )
      .lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const entries = await JournalEntry.find({
      companyId,
      status: "posted",
      deletedAt: null,
      journalDate: {
        $gte: from,
        $lte: to,
      },
      "lines.accountId": account._id,
    })
      .select(
        "_id journalNumber journalDate description entryType referenceNumber lines"
      )
      .sort({ journalDate: 1, journalNumber: 1 })
      .lean();

    let balance =
      account.openingBalanceType === "credit"
        ? -Number(account.openingBalance || 0)
        : Number(account.openingBalance || 0);

    const transactions = [];

    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        if (String(line.accountId) !== String(account._id)) {
          return;
        }

        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        balance += debit - credit;

        transactions.push({
          journalEntryId: entry._id,
          journalNumber: entry.journalNumber,
          journalDate: entry.journalDate,
          description:
            line.description || entry.description || "",
          entryType: entry.entryType,
          referenceNumber: entry.referenceNumber || null,
          debit,
          credit,
          balance: Number(balance.toFixed(2)),
        });
      });
    });

    return res.json({
      success: true,
      data: {
        account,
        openingBalance: Number(
          (
            account.openingBalanceType === "credit"
              ? -Number(account.openingBalance || 0)
              : Number(account.openingBalance || 0)
          ).toFixed(2)
        ),
        transactions,
        closingBalance: Number(balance.toFixed(2)),
        totalDebit: Number(
          transactions
            .reduce((sum, item) => sum + item.debit, 0)
            .toFixed(2)
        ),
        totalCredit: Number(
          transactions
            .reduce((sum, item) => sum + item.credit, 0)
            .toFixed(2)
        ),
      },
      period: {
        from,
        to,
      },
    });
  } catch (error) {
    console.error("Account ledger error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate account ledger",
    });
  }
};

/**
 * Financial Summary
 */
const getFinancialSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { from, to } = getDateRange(req);

    const [accounts, entries] = await Promise.all([
      Account.find({
        companyId,
        deletedAt: null,
        isActive: true,
      })
        .select(
          "_id code name type openingBalance openingBalanceType currentBalance currency"
        )
        .lean(),

      getPostedEntries(companyId, from, to),
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const totals = new Map();

    accounts.forEach((account) => {
      totals.set(String(account._id), {
        debit: 0,
        credit: 0,
      });
    });

    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const key = String(line.accountId);

        if (!totals.has(key)) return;

        const item = totals.get(key);

        item.debit += Number(line.debit || 0);
        item.credit += Number(line.credit || 0);
      });
    });

    accounts.forEach((account) => {
      const total = totals.get(String(account._id));

      if (!total) return;

      const net = total.debit - total.credit;

      switch (account.type) {
        case "income":
          totalIncome += total.credit - total.debit;
          break;

        case "expense":
          totalExpense += total.debit - total.credit;
          break;

        case "asset":
          totalAssets += net;
          break;

        case "liability":
          totalLiabilities += Math.abs(net);
          break;

        case "equity":
          totalEquity += Math.abs(net);
          break;

        default:
          break;
      }
    });

    const netProfit = totalIncome - totalExpense;

    return res.json({
      success: true,
      data: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        totalAssets: Number(totalAssets.toFixed(2)),
        totalLiabilities: Number(totalLiabilities.toFixed(2)),
        totalEquity: Number(totalEquity.toFixed(2)),
        journalEntries: entries.length,
        accounts: accounts.length,
        currency: "INR",
      },
      period: {
        from,
        to,
      },
    });
  } catch (error) {
    console.error("Financial summary error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate financial summary",
    });
  }
};

module.exports = {
  getTrialBalance,
  getGeneralLedger,
  getProfitAndLoss,
  getBalanceSheet,
  getAccountLedger,
  getFinancialSummary,
};