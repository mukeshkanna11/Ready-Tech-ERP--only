"use strict";

const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      index: true,
    },

    senderType: {
      type: String,
      enum: ["CUSTOMER", "SUPPORT"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    emailSent: {
      type: Boolean,
      default: false,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SupportMessage", supportMessageSchema);