"use client";

import { useState } from "react";
import type { PreviewCard as PreviewCardType, ExecutionReceipt } from "@/lib/types";
import TradeReceipt from "./TradeReceipt";

interface PreviewCardProps {
  preview: PreviewCardType;
  onCancel: () => void;
  onExecuted: (receipt: ExecutionReceipt) => void;
}

export default function PreviewCard({ preview, onCancel, onExecuted }: PreviewCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/command/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_token: preview.confirmation_token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution failed");
      setReceipt(data);
      onExecuted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (receipt) return <TradeReceipt receipt={receipt} />;

  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm max-w-sm mt-2 mb-2">
      <div className="flex items-center gap-3 mb-4 border-b border-zinc-50 pb-3">
        <span className="px-2 py-0.5 text-[10px] rounded-full uppercase font-bold bg-[#0000FF] text-white tracking-wider">
          {preview.type}
        </span>
        <span className="text-black font-bold text-[14px]">{preview.summary}</span>
      </div>

      <div className="space-y-2 mb-4">
        {Object.entries(preview.details).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
            <span className="capitalize text-[11px] font-bold text-zinc-500 tracking-wide">{k.replace(/_/g, " ")}</span>
            <span className="text-black font-bold text-[13px]">{v}</span>
          </div>
        ))}
      </div>

      {preview.warnings.length > 0 && (
        <div className="mb-4 space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">Warnings</span>
          {preview.warnings.map((w, i) => (
            <div key={i} className="text-amber-800 text-[12px] font-semibold flex gap-2">
              <span>⚠</span> <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-red-500 text-[12px] font-bold mb-3 text-center bg-red-50 py-2 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-full bg-black text-white text-[13px] font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Executing…" : "Confirm"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-3 rounded-full bg-zinc-100 text-black text-[13px] font-bold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
