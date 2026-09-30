const express = require("express");

const {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  postJournalEntry,
  cancelJournalEntry,
  deleteJournalEntry,
  getJournalSummary,
} = require("../controllers/journalEntry.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/summary", getJournalSummary);

router.get("/", getJournalEntries);

router.post("/", createJournalEntry);

router.get("/:id", getJournalEntryById);

router.put("/:id", updateJournalEntry);

router.post("/:id/post", postJournalEntry);

router.post("/:id/cancel", cancelJournalEntry);

router.delete("/:id", deleteJournalEntry);

module.exports = router;