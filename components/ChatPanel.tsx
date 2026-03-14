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
import VoiceMic from "./VoiceInput";

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
    { id: "0", role: "system", content: "Voice Trade ready. Type a command or hold the mic to speak." },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When voice releases, focus the input so the user can immediately edit
  useEffect(() => {
    if (!listening && input) inputRef.current?.focus();
  }, [listening]);

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
    setInput("");
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
        // Clear proposals so user doesn't keep hitting the same broken command
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, proposals: undefined, content: `${prevData.error ?? "Validation failed"} — try a new query.` }
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, proposals: undefined, content: "Network error — try again." } : m
        )
      );
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
      prev.map((m) => m.id === msgId ? { ...m, preview: undefined, receipt } : m)
    );
  }
  function handleRebalanceExecuted(msgId: string, receipts: ExecutionReceipt[]) {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, plan: undefined, planToken: undefined, receipts } : m)
    );
  }

  const canSend = input.trim().length > 0 && !loading && !listening;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* ── Messages ── */}
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
                <div className="px-4 py-2.5 rounded-2xl rounded-br-sm text-[14px] leading-relaxed"
                  style={{ background: "var(--blue)", color: "#fff", boxShadow: "0 2px 12px rgba(61,127,255,0.25)" }}>
                  {msg.content}
                </div>
              ) : (
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-[14px] leading-relaxed"
                  style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderLeft: "2px solid var(--blue)" }}>
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
                <PreviewCard preview={msg.preview} onCancel={() => handleCancelPreview(msg.id)} onExecuted={(r) => handleExecuted(msg.id, r)} />
              )}

              {msg.plan && msg.planToken && (
                <RebalancePlan plan={msg.plan} confirmationToken={msg.planToken} onExecuted={(rs) => handleRebalanceExecuted(msg.id, rs)} onCancel={() => handleCancelPreview(msg.id)} />
              )}
              {msg.receipt && <TradeReceipt receipt={msg.receipt} />}
              {msg.receipts && (
                <div className="space-y-2 w-full">{msg.receipts.map((r) => <TradeReceipt key={r.id} receipt={r} />)}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 py-3" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>

        {/* Status hint above input when listening */}
        {listening && (
          <div className="mb-2 text-center">
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--blue-bright)" }}>
              Listening\u2026 release to stop
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
          className="flex items-center gap-2"
        >
          {/* Mic button */}
          <VoiceMic
            listening={listening}
            onListeningChange={setListening}
            onTranscript={setInput}
            disabled={loading}
          />

          {/* Text input — voice fills this, user can edit freely */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Speak now\u2026" : "Type a command or hold mic to speak"}
              disabled={loading}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all duration-150 disabled:opacity-50"
              style={{
                background: "var(--surface-2)",
                color: "var(--text)",
                border: listening
                  ? "1.5px solid rgba(61,127,255,0.6)"
                  : "1px solid var(--border)",
                boxShadow: listening ? "0 0 0 3px rgba(61,127,255,0.1)" : "none",
              }}
            />
          </div>

          {/* Send button — always visible */}
          <button
            type="submit"
            disabled={!canSend}
            className="shrink-0 flex items-center justify-center rounded-xl text-[13px] font-semibold transition-all duration-150"
            style={{
              width: 42,
              height: 42,
              background: canSend ? "var(--blue)" : "var(--surface-2)",
              color: canSend ? "#fff" : "var(--text-3)",
              border: canSend ? "none" : "1px solid var(--border)",
              boxShadow: canSend ? "0 2px 10px rgba(61,127,255,0.35)" : "none",
              cursor: canSend ? "pointer" : "not-allowed",
            }}
            aria-label="Send"
          >
            {loading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                </path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>

        <p className="mt-2 text-center text-[10px]" style={{ color: "var(--text-3)" }}>
          Hold mic &middot; Edit transcript &middot; Press Enter or &uarr; to send
        </p>
      </div>
    </div>
  );
}
