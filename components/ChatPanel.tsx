"use client";

import { useState, useRef, useEffect } from "react";
import type {
  ParseResponse,
  TradePlan,
  ProposalSet,
  TradeCommand,
  PreviewCard as PreviewCardType,
  ExecutionReceipt,
} from "@/lib/types";
import PreviewCard from "./PreviewCard";
import RebalancePlan from "./RebalancePlan";
import TradeReceipt from "./TradeReceipt";
import ProposalSetView from "./ProposalSetView";
import VoiceInput from "./VoiceInput";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  preview?: PreviewCardType;
  proposals?: ProposalSet;
  plan?: TradePlan;
  planToken?: string;
  receipt?: ExecutionReceipt;
  receipts?: ExecutionReceipt[];
}

function isTradePlan(cmd: ParseResponse): cmd is TradePlan {
  return "actions" in cmd && Array.isArray((cmd as TradePlan).actions);
}

function isProposalSet(cmd: ParseResponse): cmd is ProposalSet {
  return "proposals" in cmd && Array.isArray((cmd as ProposalSet).proposals);
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
  const [proposalLoading, setProposalLoading] = useState(false);
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
    addMessage({ role: "assistant", content: "Analyzing markets…" });

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

      // Vague intent → show ranked proposals
      if (isProposalSet(parsed)) {
        updateLastMessage({
          content: parsed.user_intent,
          proposals: parsed,
        });
        return;
      }

      // Multi-instrument rebalance plan
      if (isTradePlan(parsed)) {
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

      // Explicit single command
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
    } catch {
      updateLastMessage({ content: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  }

  // User picked a proposal → run preview, then show PreviewCard
  async function handleProposalSelect(msgId: string, command: TradeCommand) {
    setProposalLoading(true);
    try {
      const prevRes = await fetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const prevData = await prevRes.json();
      if (!prevRes.ok) {
        // Validation failed (e.g. size below minimum) — show error, keep proposals visible
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: prevData.error ?? "Validation failed" }
              : m
          )
        );
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, proposals: undefined, content: prevData.summary ?? m.content, preview: prevData }
            : m
        )
      );
    } catch {
      // leave proposals visible so user can retry
    } finally {
      setProposalLoading(false);
    }
  }

  function handleCancelPreview(msgId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, preview: undefined, plan: undefined, planToken: undefined, proposals: undefined } : m
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
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              {msg.role === "system" ? (
                <div
                  className="text-[10px] font-medium text-center w-full uppercase tracking-wider my-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {msg.content}
                </div>
              ) : (
                <div
                  className="rounded-2xl px-5 py-3 text-[15px] leading-relaxed max-w-[90%]"
                  style={
                    msg.role === "user"
                      ? {
                          background: "rgba(61,255,124,0.12)",
                          color: "var(--foreground)",
                          border: "1px solid rgba(61,255,124,0.25)",
                          borderBottomRightRadius: "4px",
                        }
                      : {
                          background: "var(--card-bg)",
                          color: "var(--foreground)",
                          border: "1px solid var(--card-border)",
                          borderBottomLeftRadius: "4px",
                        }
                  }
                >
                  {msg.content}
                </div>
              )}

              {msg.proposals && (
                <div className="w-full">
                  <ProposalSetView
                    proposalSet={msg.proposals}
                    onSelect={(cmd) => handleProposalSelect(msg.id, cmd)}
                    onCancel={() => handleCancelPreview(msg.id)}
                    loading={proposalLoading}
                  />
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

      <div className="px-6 py-4 space-y-3" style={{ borderTop: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
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
            placeholder="Type a trade idea…"
            disabled={loading}
            className="flex-1 rounded-full px-6 py-3 text-[15px] focus:outline-none disabled:opacity-50 transition-all"
            style={{
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--card-border)",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-full text-[15px] font-bold transition-colors disabled:opacity-30"
            style={{ background: "var(--accent)", color: "#05080f" }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
