"use client";

import { useState, useRef, useEffect } from "react";
import type {
  ParseResponse,
  TradeCommand,
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
    {
      id: "0",
      role: "system",
      content: "Voice Trade ready. Type a command or use push-to-talk.",
    },
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
    addMessage({ role: "assistant", content: "Parsing…" });

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
        // Rebalance: get plan preview
        updateLastMessage({ content: "Generating rebalance plan…" });
        const prevRes = await fetch("/api/rebalance/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const prevData = await prevRes.json();
        if (!prevRes.ok) {
          updateLastMessage({ content: prevData.error || "Preview failed" });
          return;
        }
        updateLastMessage({
          content: parsed.intent_summary,
          plan: prevData.plan,
          planToken: prevData.confirmation_token,
        });
        return;
      }

      // Single trade command — get preview
      updateLastMessage({ content: "Validating…" });
      const prevRes = await fetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const prevData = await prevRes.json();
      if (!prevRes.ok) {
        updateLastMessage({ content: prevData.error || "Validation failed" });
        return;
      }
      updateLastMessage({
        content: prevData.summary,
        preview: prevData,
      });
    } catch (e) {
      updateLastMessage({ content: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  }

  function handleCancelPreview(msgId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, preview: undefined, plan: undefined, planToken: undefined } : m
      )
    );
  }

  function handleExecuted(msgId: string, receipt: ExecutionReceipt) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, preview: undefined, receipt } : m
      )
    );
  }

  function handleRebalanceExecuted(msgId: string, receipts: ExecutionReceipt[]) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, plan: undefined, planToken: undefined, receipts } : m
      )
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              {msg.role === "system" ? (
                <div className="text-[10px] font-medium text-zinc-400 text-center w-full uppercase tracking-wider my-4">{msg.content}</div>
              ) : (
                <div
                  className={`rounded-2xl px-5 py-3 text-[15px] leading-relaxed max-w-[90%] shadow-sm border ${
                    msg.role === "user"
                      ? "bg-black text-white rounded-br-sm border-black"
                      : "bg-white text-black rounded-bl-sm border-zinc-200"
                  }`}
                >
                  {msg.content}
                </div>
              )}

              {msg.preview && (
                <div className="w-full">
                  <PreviewCard
                    preview={msg.preview}
                    onCancel={() => handleCancelPreview(msg.id)}
                    onExecuted={(receipt) => handleExecuted(msg.id, receipt)}
                  />
                </div>
              )}

              {msg.plan && msg.planToken && (
                <div className="w-full">
                  <RebalancePlan
                    plan={msg.plan}
                    confirmationToken={msg.planToken}
                    onExecuted={(receipts) => handleRebalanceExecuted(msg.id, receipts)}
                    onCancel={() => handleCancelPreview(msg.id)}
                  />
                </div>
              )}

              {msg.receipt && (
                <div className="w-full">
                  <TradeReceipt receipt={msg.receipt} />
                </div>
              )}

              {msg.receipts && (
                <div className="w-full space-y-1">
                  {msg.receipts.map((r) => (
                    <TradeReceipt key={r.id} receipt={r} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-100 px-6 py-4 space-y-3 bg-white">
        <VoiceInput
          onTranscript={(text) => {
            setInput(text);
            handleSubmit(text);
          }}
          disabled={loading}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
            setInput("");
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a trade command…"
            disabled={loading}
            className="flex-1 rounded-full bg-zinc-100 px-6 py-3 text-[15px] text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-all border border-transparent focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-full bg-black text-white text-[15px] font-bold hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-black transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
