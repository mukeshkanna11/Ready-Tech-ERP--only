import { useEffect, useRef, useState } from "react";
import { Bot, Eraser, MessageSquare, SendHorizonal, User } from "lucide-react";
import {
  Button,
  EmptyState,
  NotConnected,
  PageHeader,
  Panel,
} from "./aiShared";
import {
  formatDate,
  logActivity,
} from "./aiUtils";

const HISTORY_KEY = "erp_ai_assistant_history";

const SUGGESTIONS = [
  "Summarize this month's purchases",
  "Which products are low on stock?",
  "List pending workflow approvals",
  "Draft a payment reminder for a customer",
];

const readHistory = () => {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const AIAssistant = () => {
  const [messages, setMessages] = useState(readHistory);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = (text) => {
    const prompt = text.trim();
    if (!prompt) return;

    const at = new Date().toISOString();
    setMessages((previous) => [
      ...previous,
      { role: "user", text: prompt, at },
      {
        role: "system",
        text: "The AI assistant service is not connected, so no response was generated.",
        at,
      },
    ]);
    setInput("");
    logActivity("Assistant prompt", prompt.slice(0, 80));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    send(input);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bot}
        title="AI Assistant"
        description="Ask questions about your ERP data in a chat interface."
        actions={
          <Button onClick={() => setMessages([])} disabled={!messages.length}>
            <Eraser size={14} />
            Clear conversation
          </Button>
        }
      />

      <NotConnected feature="The AI Assistant" />

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <Panel className="flex min-h-[520px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "58vh" }}>
            {messages.length ? (
              messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div key={index} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isUser ? "bg-cyan-400/10 text-cyan-300" : "bg-white/[0.05] text-gray-400"
                      }`}
                    >
                      {isUser ? <User size={15} /> : <Bot size={15} />}
                    </span>
                    <div className={`max-w-[80%] ${isUser ? "text-right" : ""}`}>
                      <div
                        className={`inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm ${
                          isUser
                            ? "bg-cyan-400/[0.12] text-cyan-50"
                            : "border border-amber-500/15 bg-amber-500/[0.05] text-amber-200/90"
                        }`}
                      >
                        {message.text}
                      </div>
                      <p className="mt-1 text-[10px] text-gray-600">{formatDate(message.at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="Start a conversation"
                description="Type a question below or pick a suggested action."
              />
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Ask about sales, stock, approvals… (Enter to send, Shift+Enter for a new line)"
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-[#070a11] px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/30"
            />
            <Button type="submit" variant="primary" disabled={!input.trim()} className="h-auto self-stretch">
              <SendHorizonal size={15} />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </Panel>

        <Panel title="Suggested actions">
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-sm text-gray-300 transition hover:border-cyan-400/20 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default AIAssistant;
