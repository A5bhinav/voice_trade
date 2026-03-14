"use client";

import { useState } from "react";
import type { TradePlan, ExecutionReceipt } from "@/lib/types";

interface RebalancePlanProps {
  plan: TradePlan;
  confirmationToken: string;
  onExecuted: (receipts: ExecutionReceipt[]) => void;
  onCancel: () => void;
}

export default function RebalancePlan({ plan, confirmationToken, onExecuted, onCancel }: RebalancePlanProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rebalance/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_token: confirmationToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution failed");
      onExecuted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 mt-2 mb-2 max-w-sm" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="mb-4 pb-4" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--accent-green)" }}>
          AI Agent Proposal
        </span>
        <p className="text-[14px] font-bold mt-2 leading-tight" style={{ color: "var(--foreground)" }}>
          {plan.intent_summary}
        </p>
      </div>

      {plan.preconditions.length > 0 && (
        <div className="mb-4 space-y-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-secondary)" }}>
            Checks
          </span>
          {plan.preconditions.map((p, i) => (
            <div key={i} className="text-[12px] font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
              <span style={{ color: "var(--accent-green)" }}>✓</span> {p}
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: "var(--text-secondary)" }}>
          Proposed Moves ({plan.actions.length})
        </span>
        <div className="space-y-1.5">
          {plan.actions.map((action, i) => (
            <div
              key={i}
              className="flex flex-col rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: action.side === "buy" ? "var(--accent-green)" : "#ff4444",
                      boxShadow: action.side === "buy" ? "0 0 6px rgba(61,255,124,0.6)" : "0 0 6px rgba(255,68,68,0.6)",
                    }}
                  />
                  <span className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>
                    {action.side === "buy" ? "Buy" : "Sell"} {action.symbol}
                  </span>
                </div>
                <span className="font-black text-[13px]" style={{ color: "var(--foreground)" }}>${action.size_usd}</span>
              </div>
              {action.note && (
                <span className="text-[11px] font-semibold mt-1.5 pt-1.5" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--card-border)" }}>
                  {action.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-4 pl-1" style={{ color: "var(--text-secondary)" }}>
        <span>API Mutations</span>
        <span
          className="px-2 py-0.5 rounded-full"
          style={{ background: "rgba(61,255,124,0.1)", color: "var(--accent-green)", border: "1px solid rgba(61,255,124,0.2)" }}
        >
          {plan.estimated_total_mutations}
        </span>
      </div>

      {error && (
        <div className="text-[12px] font-bold mb-4 p-2 rounded-lg text-center" style={{ color: "#ff6b6b", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-3 rounded-full text-[13px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", border: "1px solid var(--card-border)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 py-3.5 rounded-full text-[13px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 shadow-sm"
          style={{ background: "var(--accent-green)", color: "#060e09" }}
        >
          {loading ? "Executing…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
