"use client";

import { useState, useRef, useEffect } from "react";
import type {
  ParseResponse,
  TradePlan,
  PreviewCard as PreviewCardType,
  ExecutionReceipt,
} from "@/lib/types";
import PreviewCard from "./PreviewCard";
import RebalancePlan from "./RebalancePlan";
import TradeReceipt from "./TradeReceipt";
import VoiceInput from "./VoiceInput";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  preview?: PreviewCardType;
  plan?: TradePlan;
  planToken?: string;
  receipt?: ExecutionReceipt;
  receipts?: ExecutionReceipt[];
}

function isTradePlan(cmd: ParseResponse): cmd is TradePlan {
  return "intent_summary" in cmd;
}

function isClarification(cmd: ParseResponse): cmd is { clarification_needed: string } {
  return "clarification_needed" in cmd;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "system", content: "Voice Trade ready. Type a command or use push-to-talk." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(msg: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  }

  function updateLastMessage(update: Partial<Message>) {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...update };
      return next;
    });
  }

  async function handleSubmit(text: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    addMessage({ role: "user", content: text });
    addMessage({ role: "assistant", content: "Parsing\u2026" });

    try {
      const parseRes = await fetch("/api/command/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: "chat" }),
      });
      const parsed: ParseResponse = await parseRes.json();

      if (!parseRes.ok) {
        updateLastMessage({ content: (parsed as { error?: string }).error || "Parse error" });
        return;
      }
      if (isClarification(parsed)) {
        updateLastMessage({ content: parsed.clarification_needed });
        return;
      }
      if (isTradePlan(parsed)) {
        updateLastMessage({ content: "Generating rebalance plan\u2026" });
        const prevRes = await fetch("/api/rebalance/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const prevData = await prevRes.json();
        if (!prevRes.ok) { updateLastMessage({ content: prevData.error || "Preview failed" }); return; }
        updateLastMessage({ content: parsed.intent_summary, plan: prevData.plan, planToken: prevData.confirmation_token });
        return;
      }

      updateLastMessage({ content: "Validating\u2026" });
      const prevRes = await fetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const prevData = await prevRes.json();
      if (!prevRes.ok) { updateLastMessage({ content: prevData.error || "Validation failed" }); return; }
      updateLastMessage({ content: prevData.summary, preview: prevData });
    } catch {
      updateLastMessage({ content: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  }

  function handleCancelPreview(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, preview: undefined, plan: undefined, planToken: undefined } : m)
    );
  }

  function handleExecuted(msgId: string, receipt: ExecutionReceipt) {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, preview: undefined, receipt } : m)
    );
  }

  function handleRebalanceExecuted(msgId: string, receipts: ExecutionReceipt[]) {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, plan: undefined, planToken: undefined, receipts } : m)
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex flex-col gap-2 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>

              {msg.role === "system" ? (
                <div className="flex items-center gap-3 w-full my-1">
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
                    {msg.content}
                  </span>
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                </div>
              ) : msg.role === "user" ? (
                <div
                  className="px-4 py-2.5 rounded-2xl rounded-br-sm text-[14px] leading-relaxed"
                  style={{ background: "var(--blue)", color: "#fff", boxShadow: "0 2px 12px rgba(61,127,255,0.25)" }}
                >
                  {msg.content}
                </div>
              ) : (
                <div
                  className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-[14px] leading-relaxed"
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderLeft: "2px solid var(--blue)",
                  }}
                >
                  {msg.content}
                </div>
              )}

              {msg.preview && (
                <PreviewCard
                  preview={msg.preview}
                  onCancel={() => handleCancelPreview(msg.id)}
                  onExecuted={(r) => handleExecuted(msg.id, r)}
                />
              )}
              {msg.plan && msg.planToken && (
                <RebalancePlan
                  plan={msg.plan}
                  confirmationToken={msg.planToken}
                  onExecuted={(rs) => handleRebalanceExecuted(msg.id, rs)}
                  onCancel={() => handleCancelPreview(msg.id)}
                />
              )}
              {msg.receipt && <TradeReceipt receipt={msg.receipt} />}
              {msg.receipts && (
                <div className="space-y-2 w-full">
                  {msg.receipts.map((r) => <TradeReceipt key={r.id} receipt={r} />)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Bottom input bar */}
      <div
        className="shrink-0 px-5 py-4 flex flex-col gap-4"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        <VoiceInput
          onTranscript={(text) => { setInput(text); handleSubmit(text); }}
          disabled={loading}
        />
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(input); setInput(""); }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command\u2026"
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all disabled:opacity-50"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(61,127,255,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {loading ? "\u2026" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
