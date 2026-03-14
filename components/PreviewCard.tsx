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
    <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-4 text-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 text-xs rounded uppercase font-semibold bg-zinc-700 text-zinc-200">
          {preview.type}
        </span>
        <span className="text-white font-medium">{preview.summary}</span>
      </div>

      <div className="space-y-1 text-zinc-400 mb-3">
        {Object.entries(preview.details).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="capitalize">{k.replace(/_/g, " ")}</span>
            <span className="text-zinc-200">{v}</span>
          </div>
        ))}
      </div>

      {preview.warnings.length > 0 && (
        <div className="mb-3 space-y-1">
          {preview.warnings.map((w, i) => (
            <div key={i} className="text-yellow-400 text-xs">⚠ {w}</div>
          ))}
        </div>
      )}

      {error && <div className="text-red-400 text-xs mb-2">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Executing…" : "Confirm"}
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
