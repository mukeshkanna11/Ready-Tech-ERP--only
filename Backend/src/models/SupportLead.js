"use strict";

const mongoose = require("mongoose");

const supportLeadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      trim: true,
      default: "ERP Support",
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    source: {
      type: String,
      default: "ERP_SUPPORT_CHAT",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "PROPOSAL",
        "NEGOTIATION",
        "WON",
        "LOST",
      ],
      default: "NEW",
      index: true,
    },

    lastMessage: {
      type: String,
      trim: true,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SupportLead", supportLeadSchema);