"use strict";

const mongoose = require("mongoose");

const SupportConversation = require("../models/SupportConversation");
const SupportMessage = require("../models/SupportMessage");
const SupportLead = require("../models/SupportLead");

const { sendSupportEmail } = require("../services/resend.service");

const getCompanyId = (req) => {
  if (!req.companyId) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(req.companyId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(req.companyId);
};

const createConversation = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company context is missing",
      });
    }

    const {
      name,
      email,
      phone = "",
      subject = "ERP Support",
      message,
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const conversation = await SupportConversation.create({
      companyId,
      userId: req.userId || null,
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone || "").trim(),
      subject: String(subject || "ERP Support").trim(),
    });

    const firstMessage = await SupportMessage.create({
      conversationId: conversation._id,
      senderType: "CUSTOMER",
      message: String(message).trim(),
    });

    const lead = await SupportLead.create({
      companyId,
      conversationId: conversation._id,
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone || "").trim(),
      subject: String(subject || "ERP Support").trim(),
      message: String(message).trim(),
      source: "ERP_SUPPORT_CHAT",
      status: "NEW",
      lastMessage: String(message).trim(),
      lastMessageAt: new Date(),
    });

    conversation.leadCreated = true;
    conversation.leadId = lead._id;
    conversation.lastMessageAt = new Date();

    await conversation.save();

    let emailSent = false;
    let emailError = null;

    try {
      await sendSupportEmail({
        name,
        email: normalizedEmail,
        phone,
        subject,
        message,
        conversationId: conversation._id,
        leadId: lead._id,
      });

      firstMessage.emailSent = true;
      firstMessage.emailSentAt = new Date();

      await firstMessage.save();

      emailSent = true;
    } catch (error) {
      console.error("Support email error:", error);

      emailError = error.message || "Email sending failed";
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Support chat created successfully"
        : "Support chat created, but email could not be sent",
      data: {
        conversationId: conversation._id,
        leadId: lead._id,
        emailSent,
        emailError,
      },
    });
  } catch (error) {
    console.error("Create support conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create support conversation",
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company context is missing",
      });
    }

    const { conversationId } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const conversation = await SupportConversation.findOne({
      _id: conversationId,
      companyId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Support conversation not found",
      });
    }

    if (conversation.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "This support conversation is closed",
      });
    }

    const cleanMessage = String(message).trim();

    const supportMessage = await SupportMessage.create({
      conversationId: conversation._id,
      senderType: "CUSTOMER",
      message: cleanMessage,
    });

    conversation.lastMessageAt = new Date();

    await conversation.save();

    const lead = await SupportLead.findOne({
      _id: conversation.leadId,
      companyId,
    });

    if (lead) {
      lead.lastMessage = cleanMessage;
      lead.lastMessageAt = new Date();

      await lead.save();
    }

    let emailSent = false;
    let emailError = null;

    try {
      await sendSupportEmail({
        name: conversation.name,
        email: conversation.email,
        phone: conversation.phone,
        subject: conversation.subject,
        message: cleanMessage,
        conversationId: conversation._id,
        leadId: conversation.leadId,
      });

      supportMessage.emailSent = true;
      supportMessage.emailSentAt = new Date();

      await supportMessage.save();

      emailSent = true;
    } catch (error) {
      console.error("Support message email error:", error);

      emailError = error.message || "Email sending failed";
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Message sent successfully"
        : "Message saved, but email could not be sent",
      data: {
        messageId: supportMessage._id,
        conversationId: conversation._id,
        leadId: conversation.leadId,
        emailSent,
        emailError,
      },
    });
  } catch (error) {
    console.error("Send support message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send support message",
      error: error.message,
    });
  }
};

const getConversation = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company context is missing",
      });
    }

    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await SupportConversation.findOne({
      _id: conversationId,
      companyId,
    }).lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Support conversation not found",
      });
    }

    const messages = await SupportMessage.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    console.error("Get support conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch support conversation",
      error: error.message,
    });
  }
};

const getMyConversations = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company context is missing",
      });
    }

    const conversations = await SupportConversation.find({
      companyId,
      userId: req.userId || null,
    })
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Get support conversations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch support conversations",
      error: error.message,
    });
  }
};

module.exports = {
  createConversation,
  sendMessage,
  getConversation,
  getMyConversations,
};