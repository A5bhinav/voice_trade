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
                <div className="text-xs text-zinc-500 text-center w-full">{msg.content}</div>
              ) : (
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
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

      <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
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
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
