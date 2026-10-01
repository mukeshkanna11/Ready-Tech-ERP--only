import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  User,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

const STORAGE_KEY = "readytech_support_conversation";

const SUGGESTIONS = [
  "I need help with Sales",
  "I have an issue with Purchase",
  "How can I manage Inventory?",
  "I need help with Customers",
  "I need help with Vendors",
  "I have an Invoice issue",
  "I need help with Payments",
  "I need help with HR",
  "I need help with Reports",
  "I need help with ERP setup",
];

// Backend requires an email; use the signed-in ERP user's email.
const getSessionEmail = () => {
  try {
    const raw =
      localStorage.getItem("erp_user") ||
      sessionStorage.getItem("erp_user");

    return JSON.parse(raw || "{}")?.email || "";
  } catch {
    return "";
  }
};

const SupportChat = () => {
  const navigate = useNavigate();
  const [open] = useState(true);
  const [mode, setMode] = useState("form");

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed?.conversationId) {
          setConversationId(parsed.conversationId);
          setMode("chat");
        }
      }
    } catch (error) {
      console.error("Support conversation restore error:", error);
    }
  }, []);

  useEffect(() => {
    if (conversationId && mode === "chat") {
      loadConversation(conversationId);
    }
  }, [conversationId, mode]);

  useEffect(() => {
    if (open && mode === "chat") {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [open, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getData = (response) => {
    return response?.data?.data || response?.data || {};
  };

  const loadConversation = async (id) => {
    if (!id) return;

    setLoadingConversation(true);
    setError("");

    try {
      const response = await API.get(`/support/chat/${id}`);

      const data = getData(response);

      if (Array.isArray(data?.messages)) {
        setMessages(data.messages);
      }

      if (data?.conversation) {
        setForm((prev) => ({
          ...prev,
          name: data.conversation.name || prev.name,
          email: data.conversation.email || prev.email,
          phone: data.conversation.phone || prev.phone,
          subject: data.conversation.subject || prev.subject,
        }));
      }
    } catch (error) {
      console.error("Support conversation loading error:", error);

      const status = error?.response?.status;

      if (status === 403 || status === 404) {
        localStorage.removeItem(STORAGE_KEY);

        setConversationId(null);
        setMessages([]);
        setMode("form");
      } else {
        setError(
          error?.response?.data?.message ||
            "Unable to load support conversation."
        );
      }
    } finally {
      setLoadingConversation(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return false;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return false;
    }

    if (!form.message.trim()) {
      setError("Please enter your message.");
      return false;
    }

    if (!form.email && !getSessionEmail()) {
      setError("Unable to identify your account. Please sign in again.");
      return false;
    }

    return true;
  };

  const createConversation = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await API.post("/support/chat", {
        name: form.name.trim(),
        email: form.email || getSessionEmail(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });

      const data = getData(response);

      if (!data?.conversationId) {
        throw new Error("Conversation ID was not returned.");
      }

      const id = data.conversationId;

      setConversationId(id);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conversationId: id,
          leadId: data.leadId || null,
        })
      );

      setMessages([
        {
          _id: `local-${Date.now()}`,
          senderType: "CUSTOMER",
          message: form.message.trim(),
          createdAt: new Date().toISOString(),
          emailSent: data.emailSent,
        },
      ]);

      setForm((prev) => ({
        ...prev,
        message: "",
      }));

      setMode("chat");

      if (data.emailSent) {
        setSuccess("Support request sent successfully.");
      } else {
        setSuccess("Message saved successfully.");
      }
    } catch (error) {
      console.error("Support conversation creation error:", error);

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to start support chat."
      );
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event?.preventDefault();

    const text = message.trim();

    if (!text || !conversationId || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const temporaryId = `temporary-${Date.now()}`;

    const temporaryMessage = {
      _id: temporaryId,
      senderType: "CUSTOMER",
      message: text,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, temporaryMessage]);
    setMessage("");

    try {
      const response = await API.post(
        `/support/chat/${conversationId}/messages`,
        {
          message: text,
        }
      );

      const data = getData(response);

      const returnedMessage =
        data?.message ||
        data?.supportMessage ||
        null;

      setMessages((prev) => {
        const filtered = prev.filter(
          (item) => item._id !== temporaryId
        );

        if (returnedMessage) {
          return [...filtered, returnedMessage];
        }

        return [
          ...filtered,
          {
            ...temporaryMessage,
            pending: false,
            emailSent: data?.emailSent,
          },
        ];
      });

      if (data?.emailSent) {
        setSuccess("Message sent.");
      }
    } catch (error) {
      console.error("Support message sending error:", error);

      setMessages((prev) =>
        prev.filter((item) => item._id !== temporaryId)
      );

      setMessage(text);

      setError(
        error?.response?.data?.message ||
          "Unable to send message."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshConversation = () => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  };

  const startNewConversation = () => {
    localStorage.removeItem(STORAGE_KEY);

    setConversationId(null);
    setMessages([]);
    setMessage("");
    setError("");
    setSuccess("");

    setForm({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });

    setMode("form");
  };

  const formatTime = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="flex min-h-full w-full items-start justify-center bg-[#05070b] px-3 py-6 sm:px-6 sm:py-10">

        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key="support-window"
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 25,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 25,
              }}
              transition={{
                duration: 0.2,
              }}
              className="w-full max-w-[720px] overflow-hidden rounded-[28px] border border-white/[0.10] bg-[#080a0f]/95 shadow-[0_30px_100px_rgba(0,0,0,0.70)] backdrop-blur-2xl"
            >

              {/* HEADER */}

              <div className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-br from-cyan-500/[0.14] via-transparent to-blue-500/[0.10] px-5 py-4">

                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                      <BrainCircuit size={21} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold tracking-wide text-white">
                        Ready Tech Support
                      </h3>

                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

                        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                          Support Team
                        </span>
                      </div>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-gray-500 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X size={18} />
                  </button>

                </div>
              </div>

              {/* FORM */}

              {mode === "form" && (
                <form
                  onSubmit={createConversation}
                  className="max-h-[calc(100vh-140px)] overflow-y-auto"
                >

                  <div className="px-5 py-5">

                    <div className="mb-5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-white">
                          How can we help?
                        </h2>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Send your issue to our support team and continue
                        the conversation here.
                      </p>
                    </div>

                    {error && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-3 text-xs text-red-300">
                        <AlertCircle
                          size={15}
                          className="mt-0.5 shrink-0"
                        />

                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-3">

                      <SupportInput
                        icon={User}
                        label="Name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={(value) =>
                          updateForm("name", value)
                        }
                      />

                      <SupportInput
                        icon={Phone}
                        label="Phone"
                        placeholder="+91 9876543210"
                        value={form.phone}
                        onChange={(value) =>
                          updateForm("phone", value)
                        }
                      />

                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Message
                        </label>

                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {SUGGESTIONS.map((text) => (
                            <button
                              key={text}
                              type="button"
                              onClick={() => updateForm("message", text)}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur transition ${
                                form.message === text
                                  ? "border-cyan-400/40 bg-cyan-400/[0.12] text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                                  : "border-white/[0.08] bg-white/[0.03] text-gray-400 hover:border-cyan-400/25 hover:bg-cyan-400/[0.06] hover:text-cyan-200"
                              }`}
                            >
                              {text}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={form.message}
                          onChange={(event) =>
                            updateForm(
                              "message",
                              event.target.value
                            )
                          }
                          placeholder="Describe your issue..."
                          rows={4}
                          maxLength={2000}
                          className="w-full resize-none rounded-2xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-sm text-gray-200 outline-none transition placeholder:text-gray-700 focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-2 focus:ring-cyan-400/10"
                        />

                        <div className="mt-1 text-right text-[9px] text-gray-700">
                          {form.message.length}/2000
                        </div>
                      </div>

                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(6,182,212,0.20)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                          Starting chat...
                        </>
                      ) : (
                        <>
                          Start Support Chat
                          <Send size={16} />
                        </>
                      )}
                    </button>

                    <p className="mt-3 text-center text-[9px] leading-4 text-gray-700">
                      Your support request will be securely sent to
                      Ready Tech Solutions.
                    </p>

                  </div>
                </form>
              )}

              {/* CHAT */}

              {mode === "chat" && (
                <div className="flex h-[570px] max-h-[calc(100vh-140px)] flex-col">

                  {/* CHAT INFO */}

                  <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">

                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-gray-300">
                        {form.subject || "Support Conversation"}
                      </p>

                      <p className="mt-1 text-[9px] text-gray-600">
                        Conversation #
                        {conversationId
                          ? conversationId.slice(-8)
                          : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={refreshConversation}
                      disabled={loadingConversation}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                    >
                      <RefreshCw
                        size={14}
                        className={
                          loadingConversation
                            ? "animate-spin"
                            : ""
                        }
                      />
                    </button>

                  </div>

                  {/* MESSAGES */}

                  <div className="relative flex-1 overflow-y-auto px-4 py-5">

                    {loadingConversation &&
                      messages.length === 0 && (
                        <div className="flex h-full items-center justify-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2
                              size={23}
                              className="animate-spin text-cyan-400"
                            />

                            <p className="text-xs text-gray-600">
                              Loading conversation...
                            </p>
                          </div>
                        </div>
                      )}

                    {!loadingConversation &&
                      messages.length === 0 && (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">

                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-300">
                              <MessageCircle size={23} />
                            </div>

                            <p className="mt-4 text-sm font-medium text-gray-300">
                              Start the conversation
                            </p>

                            <p className="mt-1 text-xs text-gray-600">
                              Our support team will receive your message.
                            </p>

                          </div>
                        </div>
                      )}

                    {messages.length > 0 && (
                      <div className="space-y-4">

                        <div className="flex justify-center">
                          <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-gray-600">
                            Support Conversation
                          </span>
                        </div>

                        {messages.map((item, index) => {

                          const customer =
                            item.senderType === "CUSTOMER";

                          return (
                            <motion.div
                              key={
                                item._id ||
                                `${item.createdAt}-${index}`
                              }
                              initial={{
                                opacity: 0,
                                y: 8,
                              }}
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              className={`flex ${
                                customer
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >

                              <div className="max-w-[82%]">

                                <div
                                  className={`rounded-2xl px-4 py-3 text-sm leading-5 ${
                                    customer
                                      ? "rounded-br-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_8px_25px_rgba(8,145,178,0.18)]"
                                      : "rounded-bl-md border border-white/[0.08] bg-white/[0.045] text-gray-300"
                                  } ${
                                    item.pending
                                      ? "opacity-50"
                                      : ""
                                  }`}
                                >
                                  {item.message}
                                </div>

                                <div
                                  className={`mt-1.5 flex items-center gap-1.5 px-1 text-[9px] text-gray-700 ${
                                    customer
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <span>
                                    {formatTime(
                                      item.createdAt
                                    )}
                                  </span>

                                  {customer &&
                                    !item.pending && (
                                      <>
                                        {item.emailSent ? (
                                          <CheckCircle2
                                            size={10}
                                            className="text-emerald-500/70"
                                          />
                                        ) : (
                                          <AlertCircle
                                            size={10}
                                            className="text-amber-500/70"
                                          />
                                        )}
                                      </>
                                    )}

                                  {item.pending && (
                                    <Loader2
                                      size={9}
                                      className="animate-spin"
                                    />
                                  )}
                                </div>

                              </div>

                            </motion.div>
                          );
                        })}

                        <div ref={messagesEndRef} />

                      </div>
                    )}

                  </div>

                  {/* ERROR */}

                  {error && (
                    <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2.5 text-[10px] text-red-300">
                      <AlertCircle
                        size={13}
                        className="mt-0.5 shrink-0"
                      />

                      <span>{error}</span>
                    </div>
                  )}

                  {/* SUCCESS */}

                  {success && (
                    <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2.5 text-[10px] text-emerald-300">
                      <CheckCircle2 size={13} />

                      <span>{success}</span>
                    </div>
                  )}

                  {/* MESSAGE INPUT */}

                  <form
                    onSubmit={sendMessage}
                    className="border-t border-white/[0.07] bg-black/20 p-3"
                  >

                    <div className="flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-1.5 transition focus-within:border-cyan-400/30">

                      <textarea
                        ref={inputRef}
                        value={message}
                        onChange={(event) =>
                          setMessage(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();

                            if (
                              message.trim() &&
                              !loading
                            ) {
                              sendMessage(event);
                            }
                          }
                        }}
                        rows={1}
                        maxLength={2000}
                        placeholder="Type your message..."
                        className="max-h-24 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-700"
                      />

                      <button
                        type="submit"
                        disabled={
                          !message.trim() ||
                          loading
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {loading ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>

                    </div>

                    <div className="mt-2 flex items-center justify-between px-1">

                      <span className="text-[9px] text-gray-700">
                        Enter to send
                      </span>

                      <button
                        type="button"
                        onClick={startNewConversation}
                        className="text-[9px] text-gray-700 transition hover:text-red-400"
                      >
                        New conversation
                      </button>

                    </div>

                  </form>

                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

const SupportInput = ({
  icon: Icon,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
        {label}
      </label>

      <div className="relative">

        <Icon
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
        />

        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-10 pr-3.5 text-sm text-gray-200 outline-none transition placeholder:text-gray-700 focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-2 focus:ring-cyan-400/10"
        />

      </div>
    </div>
  );
};

export default SupportChat;