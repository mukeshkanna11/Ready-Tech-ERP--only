const mongoose = require("mongoose");
const Account = require("../models/Account");

const ensureAccountBelongsToCompany = async (
  accountId,
  companyId,
  session = null
) => {
  if (
    !mongoose.Types.ObjectId.isValid(accountId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    throw new Error("Invalid account or company ID");
  }

  let query = Account.findOne({
    _id: accountId,
    companyId,
    deletedAt: null,
    isActive: true,
  });

  if (session) {
    query = query.session(session);
  }

  const account = await query;

  if (!account) {
    throw new Error(
      "Account does not belong to the current company"
    );
  }

  return account;
};

const calculateEntryTotals = (lines = []) => {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error(
      "Journal entry must contain at least two lines"
    );
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (
      !Number.isFinite(debit) ||
      !Number.isFinite(credit)
    ) {
      throw new Error(
        "Debit and credit must be valid numbers"
      );
    }

    if (debit < 0 || credit < 0) {
      throw new Error(
        "Debit and credit cannot be negative"
      );
    }

    if (debit > 0 && credit > 0) {
      throw new Error(
        "A journal line cannot contain both debit and credit"
      );
    }

    if (debit === 0 && credit === 0) {
      throw new Error(
        "Every journal line must contain debit or credit"
      );
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  totalDebit = Number(totalDebit.toFixed(2));
  totalCredit = Number(totalCredit.toFixed(2));

  const difference = Number(
    Math.abs(totalDebit - totalCredit).toFixed(2)
  );

  return {
    totalDebit,
    totalCredit,
    difference,
    balanced: difference < 0.01,
  };
};

const validateJournalLines = async ({
  lines,
  companyId,
  session = null,
}) => {
  const accountIds = lines.map((line) =>
    String(line.accountId)
  );

  const uniqueAccountIds = [...new Set(accountIds)];

  if (uniqueAccountIds.length !== accountIds.length) {
    throw new Error(
      "Duplicate account lines are not allowed"
    );
  }

  for (const accountId of uniqueAccountIds) {
    await ensureAccountBelongsToCompany(
      accountId,
      companyId,
      session
    );
  }

  return true;
};

const updateAccountBalance = async ({
  accountId,
  companyId,
  debit = 0,
  credit = 0,
  session = null,
}) => {
  const account = await ensureAccountBelongsToCompany(
    accountId,
    companyId,
    session
  );

  const debitAmount = Number(debit || 0);
  const creditAmount = Number(credit || 0);

  let change = 0;

  if (account.normalBalance === "debit") {
    change = debitAmount - creditAmount;
  } else {
    change = creditAmount - debitAmount;
  }

  const query = Account.updateOne(
    {
      _id: account._id,
      companyId,
      deletedAt: null,
      isActive: true,
    },
    {
      $inc: {
        currentBalance: change,
      },
    }
  );

  if (session) {
    query.session(session);
  }

  await query;

  return {
    accountId: account._id,
    change: Number(change.toFixed(2)),
  };
};

const postJournalToAccounts = async ({
  lines,
  companyId,
  session,
}) => {
  for (const line of lines) {
    await updateAccountBalance({
      accountId: line.accountId,
      companyId,
      debit: line.debit,
      credit: line.credit,
      session,
    });
  }
};

const reverseJournalFromAccounts = async ({
  lines,
  companyId,
  session,
}) => {
  for (const line of lines) {
    await updateAccountBalance({
      accountId: line.accountId,
      companyId,
      debit: line.credit,
      credit: line.debit,
      session,
    });
  }
};

module.exports = {
  ensureAccountBelongsToCompany,
  calculateEntryTotals,
  validateJournalLines,
  updateAccountBalance,
  postJournalToAccounts,
  reverseJournalFromAccounts,
};