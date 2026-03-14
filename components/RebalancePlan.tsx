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
    <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-4 text-sm">
      <div className="mb-3">
        <span className="text-xs uppercase font-semibold text-zinc-400">Rebalance Plan</span>
        <p className="text-white mt-1">{plan.intent_summary}</p>
      </div>

      {plan.preconditions.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-zinc-500 uppercase">Checks</span>
          {plan.preconditions.map((p, i) => (
            <div key={i} className="text-zinc-300 text-xs ml-2">✓ {p}</div>
          ))}
        </div>
      )}

      <div className="mb-3 space-y-2">
        <span className="text-xs text-zinc-500 uppercase">Actions ({plan.actions.length})</span>
        {plan.actions.map((action, i) => (
          <div key={i} className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${action.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                {action.side}
              </span>
              <span className="text-zinc-200">{action.symbol}</span>
              {action.note && <span className="text-zinc-500 text-xs">{action.note}</span>}
            </div>
            <span className="text-zinc-200 font-medium">${action.size_usd}</span>
          </div>
        ))}
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        Est. mutations: {plan.estimated_total_mutations}
      </div>

      {error && <div className="text-red-400 text-xs mb-2">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Executing…" : "Approve Plan"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
