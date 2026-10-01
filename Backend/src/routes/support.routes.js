"use strict";

const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
  createConversation,
  sendMessage,
  getConversation,
  getMyConversations,
} = require("../controllers/support.controller");

router.use(authenticate);

router.post("/chat", createConversation);

router.post("/chat/:conversationId/messages", sendMessage);

router.get("/chat/:conversationId", getConversation);

router.get("/chats", getMyConversations);

module.exports = router;