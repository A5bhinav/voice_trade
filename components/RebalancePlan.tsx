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
    <div className="rounded-xl overflow-hidden w-full max-w-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--blue-bright)" }}>AI Proposal</span>
        <p className="text-[13px] font-semibold mt-1 leading-snug" style={{ color: "var(--text)" }}>{plan.intent_summary}</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Preconditions */}
        {plan.preconditions.length > 0 && (
          <div className="rounded-lg px-3 py-2.5 space-y-1.5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: "var(--text-3)" }}>Checks</span>
            {plan.preconditions.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] font-medium" style={{ color: "var(--text-2)" }}>
                <span style={{ color: "var(--green)" }}>&#10003;</span><span>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Moves ({plan.actions.length})
          </span>
          {plan.actions.map((action, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: action.side === "buy" ? "var(--green)" : "var(--red)",
                    boxShadow: action.side === "buy" ? "0 0 6px rgba(32,201,122,0.5)" : "0 0 6px rgba(240,69,69,0.5)",
                  }}
                />
                <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>
                  <span className="font-bold" style={{ color: action.side === "buy" ? "var(--green)" : "var(--red)" }}>
                    {action.side === "buy" ? "Buy" : "Sell"}
                  </span>{" "}{action.symbol}
                </span>
              </div>
              <span className="text-[12px] font-semibold font-mono" style={{ color: "var(--text)" }}>${action.size_usd}</span>
            </div>
          ))}
        </div>

        {/* Mutations */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>API Mutations</span>
          <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded"
            style={{ background: "var(--blue-dim)", color: "var(--blue-bright)" }}>
            {plan.estimated_total_mutations}
          </span>
        </div>

        {error && (
          <div className="rounded-lg px-3 py-2 text-[11px] font-medium text-center"
            style={{ background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(240,69,69,0.25)" }}>
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
          Cancel
        </button>
        <button onClick={handleApprove} disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--blue)", color: "#fff", boxShadow: "0 2px 10px rgba(61,127,255,0.3)" }}>
          {loading ? "Executing\u2026" : "Approve"}
        </button>
      </div>
    </div>
  );
}
