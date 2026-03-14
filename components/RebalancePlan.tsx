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
    <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-md max-w-sm mt-2 mb-2">
      <div className="mb-5 border-b border-zinc-50 pb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#0000FF]">Rebalance Plan</span>
        <p className="text-[15px] font-bold text-black mt-2 leading-tight">{plan.intent_summary}</p>
      </div>

      {plan.preconditions.length > 0 && (
        <div className="mb-5 space-y-2 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Checks</span>
          {plan.preconditions.map((p, i) => (
            <div key={i} className="text-black text-[12px] font-semibold flex items-center gap-2">
              <span className="text-[#0000FF]">✓</span> {p}
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Actions ({plan.actions.length})</span>
        <div className="space-y-2">
          {plan.actions.map((action, i) => (
            <div key={i} className="flex flex-col bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${action.side === "buy" ? "bg-black text-white" : "bg-zinc-200 text-black"}`}>
                    {action.side}
                  </span>
                  <span className="font-bold text-[14px] text-black">{action.symbol}</span>
                </div>
                <span className="font-black text-[14px] text-black">${action.size_usd}</span>
              </div>
              {action.note && <span className="text-zinc-500 text-[11px] font-semibold mt-2 border-t border-zinc-100 pt-2">{action.note}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-5 pl-1">
        <span>API Mutations</span>
        <span className="text-black bg-zinc-100 px-2 py-0.5 rounded-full">{plan.estimated_total_mutations}</span>
      </div>

      {error && <div className="text-red-500 text-[12px] font-bold mb-4 bg-red-50 p-2 rounded-lg text-center">{error}</div>}

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 py-3.5 rounded-full bg-[#0000FF] text-white text-[13px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Executing…" : "Approve Plan"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3.5 rounded-full bg-zinc-100 text-black text-[13px] font-black uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
