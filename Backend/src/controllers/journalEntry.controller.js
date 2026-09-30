const mongoose = require("mongoose");

const JournalEntry = require("../models/JournalEntry");
const {
  calculateEntryTotals,
  validateJournalLines,
  postJournalToAccounts,
  reverseJournalFromAccounts,
} = require("../services/accounting.service");

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getCompanyId = (req) => {
  if (!req.companyId || !isValidId(req.companyId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(req.companyId);
};

const generateJournalNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const prefix = `JE-${year}-`;

  const latest = await JournalEntry.findOne({
    companyId,
    journalNumber: {
      $regex: `^${prefix}`,
    },
  })
    .sort({ journalNumber: -1 })
    .select("journalNumber")
    .lean();

  let nextNumber = 1;

  if (latest?.journalNumber) {
    const current = Number(
      latest.journalNumber.replace(prefix, "")
    );

    if (Number.isFinite(current)) {
      nextNumber = current + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

const normalizeLines = (lines) =>
  lines.map((line) => ({
    accountId: line.accountId,
    description: String(
      line.description || ""
    ).trim(),
    debit: Number(line.debit || 0),
    credit: Number(line.credit || 0),
  }));

const createJournalEntry = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    const {
      branchId,
      referenceNumber,
      journalDate,
      description,
      entryType,
      lines,
      currency,
      notes,
    } = req.body;

    if (
      branchId &&
      !isValidId(branchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Journal entry requires at least two lines",
      });
    }

    const normalizedLines = normalizeLines(lines);

    const totals =
      calculateEntryTotals(normalizedLines);

    if (!totals.balanced) {
      return res.status(400).json({
        success: false,
        message:
          "Journal entry is not balanced. Total debit and credit must be equal.",
        data: totals,
      });
    }

    await validateJournalLines({
      lines: normalizedLines,
      companyId,
    });

    const journalNumber =
      await generateJournalNumber(companyId);

    const journal = await JournalEntry.create({
      companyId,
      branchId: branchId || null,
      journalNumber,
      referenceNumber:
        String(referenceNumber || "").trim(),
      journalDate: journalDate
        ? new Date(journalDate)
        : new Date(),
      description:
        String(description || "").trim(),
      entryType: entryType || "general",
      status: "draft",
      lines: normalizedLines,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      difference: totals.difference,
      currency: String(currency || "INR")
        .trim()
        .toUpperCase(),
      notes: String(notes || "").trim(),
      createdBy: req.userId || null,
      updatedBy: req.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      data: journal,
    });
  } catch (error) {
    next(error);
  }
};

const getJournalEntries = async (
  req,
  res,
  next
) => {
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
      status,
      entryType,
      branchId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {
      companyId,
      deletedAt: null,
    };

    if (status) {
      filter.status = status;
    }

    if (entryType) {
      filter.entryType = entryType;
    }

    if (branchId) {
      if (!isValidId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      filter.branchId = branchId;
    }

    if (search.trim()) {
      const regex = new RegExp(
        search.trim(),
        "i"
      );

      filter.$or = [
        { journalNumber: regex },
        { referenceNumber: regex },
        { description: regex },
        { notes: regex },
      ];
    }

    if (fromDate || toDate) {
      filter.journalDate = {};

      if (fromDate) {
        filter.journalDate.$gte =
          new Date(`${fromDate}T00:00:00.000Z`);
      }

      if (toDate) {
        filter.journalDate.$lte =
          new Date(`${toDate}T23:59:59.999Z`);
      }
    }

    const skip =
      (currentPage - 1) * perPage;

    const [entries, total] =
      await Promise.all([
        JournalEntry.find(filter)
          .populate(
            "lines.accountId",
            "code name type normalBalance"
          )
          .populate(
            "branchId",
            "name code"
          )
          .sort({
            journalDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(perPage)
          .lean(),

        JournalEntry.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      data: entries,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        pages: Math.ceil(
          total / perPage
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getJournalEntryById = async (
  req,
  res,
  next
) => {
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
        message: "Invalid journal entry ID",
      });
    }

    const journal =
      await JournalEntry.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      })
        .populate(
          "lines.accountId",
          "code name type normalBalance"
        )
        .populate(
          "branchId",
          "name code"
        )
        .lean();

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    return res.json({
      success: true,
      data: journal,
    });
  } catch (error) {
    next(error);
  }
};

const updateJournalEntry = async (
  req,
  res,
  next
) => {
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
        message: "Invalid journal entry ID",
      });
    }

    const journal =
      await JournalEntry.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    if (journal.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft journal entries can be edited",
      });
    }

    const {
      branchId,
      referenceNumber,
      journalDate,
      description,
      entryType,
      lines,
      currency,
      notes,
    } = req.body;

    if (
      branchId &&
      !isValidId(branchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    if (lines !== undefined) {
      if (
        !Array.isArray(lines) ||
        lines.length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Journal entry requires at least two lines",
        });
      }

      const normalizedLines =
        normalizeLines(lines);

      const totals =
        calculateEntryTotals(
          normalizedLines
        );

      if (!totals.balanced) {
        return res.status(400).json({
          success: false,
          message:
            "Journal entry is not balanced",
          data: totals,
        });
      }

      await validateJournalLines({
        lines: normalizedLines,
        companyId,
      });

      journal.lines = normalizedLines;
      journal.totalDebit =
        totals.totalDebit;
      journal.totalCredit =
        totals.totalCredit;
      journal.difference =
        totals.difference;
    }

    if (branchId !== undefined) {
      journal.branchId =
        branchId || null;
    }

    if (
      referenceNumber !== undefined
    ) {
      journal.referenceNumber =
        String(referenceNumber).trim();
    }

    if (journalDate !== undefined) {
      const date = new Date(
        journalDate
      );

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid journal date",
        });
      }

      journal.journalDate = date;
    }

    if (
      description !== undefined
    ) {
      journal.description =
        String(description).trim();
    }

    if (entryType !== undefined) {
      journal.entryType = entryType;
    }

    if (currency !== undefined) {
      journal.currency =
        String(currency)
          .trim()
          .toUpperCase();
    }

    if (notes !== undefined) {
      journal.notes =
        String(notes).trim();
    }

    journal.updatedBy =
      req.userId || null;

    await journal.save();

    return res.json({
      success: true,
      message:
        "Journal entry updated successfully",
      data: journal,
    });
  } catch (error) {
    next(error);
  }
};

const postJournalEntry = async (
  req,
  res,
  next
) => {
  const session =
    await mongoose.startSession();

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
        message: "Invalid journal entry ID",
      });
    }

    let result;

    await session.withTransaction(
      async () => {
        const journal =
          await JournalEntry.findOne({
            _id: id,
            companyId,
            deletedAt: null,
          }).session(session);

        if (!journal) {
          throw new Error(
            "Journal entry not found"
          );
        }

        if (journal.status !== "draft") {
          throw new Error(
            "Only draft journal entries can be posted"
          );
        }

        const totals =
          calculateEntryTotals(
            journal.lines
          );

        if (!totals.balanced) {
          throw new Error(
            "Journal entry is not balanced"
          );
        }

        await validateJournalLines({
          lines: journal.lines,
          companyId,
          session,
        });

        await postJournalToAccounts({
          lines: journal.lines,
          companyId,
          session,
        });

        journal.status = "posted";
        journal.postedAt = new Date();
        journal.postedBy =
          req.userId || null;
        journal.updatedBy =
          req.userId || null;

        await journal.save({
          session,
        });

        result = journal;
      }
    );

    return res.json({
      success: true,
      message:
        "Journal entry posted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

const cancelJournalEntry = async (
  req,
  res,
  next
) => {
  const session =
    await mongoose.startSession();

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
        message: "Invalid journal entry ID",
      });
    }

    const reason = String(
      req.body?.reason || ""
    ).trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason is required",
      });
    }

    let result;

    await session.withTransaction(
      async () => {
        const journal =
          await JournalEntry.findOne({
            _id: id,
            companyId,
            deletedAt: null,
          }).session(session);

        if (!journal) {
          throw new Error(
            "Journal entry not found"
          );
        }

        if (
          !["draft", "posted"].includes(
            journal.status
          )
        ) {
          throw new Error(
            "Journal entry is already cancelled"
          );
        }

        if (journal.status === "posted") {
          await reverseJournalFromAccounts({
            lines: journal.lines,
            companyId,
            session,
          });
        }

        journal.status = "cancelled";
        journal.cancelledAt =
          new Date();
        journal.cancelledBy =
          req.userId || null;
        journal.cancellationReason =
          reason;
        journal.updatedBy =
          req.userId || null;

        await journal.save({
          session,
        });

        result = journal;
      }
    );

    return res.json({
      success: true,
      message:
        "Journal entry cancelled successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

const deleteJournalEntry = async (
  req,
  res,
  next
) => {
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
        message: "Invalid journal entry ID",
      });
    }

    const journal =
      await JournalEntry.findOne({
        _id: id,
        companyId,
        deletedAt: null,
      });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    if (journal.status === "posted") {
      return res.status(400).json({
        success: false,
        message:
          "Posted journal entries cannot be deleted. Cancel them instead.",
      });
    }

    journal.deletedAt = new Date();
    journal.deletedBy =
      req.userId || null;
    journal.updatedBy =
      req.userId || null;

    await journal.save();

    return res.json({
      success: true,
      message:
        "Journal entry deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getJournalSummary = async (
  req,
  res,
  next
) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Valid company context is required",
      });
    }

    const summary =
      await JournalEntry.aggregate([
        {
          $match: {
            companyId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            debit: {
              $sum: "$totalDebit",
            },
            credit: {
              $sum: "$totalCredit",
            },
          },
        },
      ]);

    const result = {
      total: 0,
      draft: 0,
      posted: 0,
      cancelled: 0,
      totalDebit: 0,
      totalCredit: 0,
    };

    summary.forEach((item) => {
      result.total += item.count;

      if (
        Object.prototype.hasOwnProperty.call(
          result,
          item._id
        )
      ) {
        result[item._id] =
          item.count;
      }

      if (
        item._id === "posted"
      ) {
        result.totalDebit =
          Number(
            item.debit.toFixed(2)
          );

        result.totalCredit =
          Number(
            item.credit.toFixed(2)
          );
      }
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  postJournalEntry,
  cancelJournalEntry,
  deleteJournalEntry,
  getJournalSummary,
};