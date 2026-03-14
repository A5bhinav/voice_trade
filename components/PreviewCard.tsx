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
    <div className="rounded-2xl p-5 mt-2 mb-2 max-w-sm" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <span
          className="px-2 py-0.5 text-[10px] rounded-full uppercase font-bold tracking-wider"
          style={{ background: "rgba(74,144,217,0.15)", color: "var(--accent)", border: "1px solid rgba(74,144,217,0.3)" }}
        >
          {preview.type}
        </span>
        <span className="font-bold text-[14px]" style={{ color: "var(--foreground)" }}>{preview.summary}</span>
      </div>

      <div className="space-y-2 mb-4">
        {Object.entries(preview.details).map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between items-center px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <span className="capitalize text-[11px] font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {k.replace(/_/g, " ")}
            </span>
            <span className="font-bold text-[13px]" style={{ color: "var(--foreground)" }}>{v}</span>
          </div>
        ))}
      </div>

      {preview.warnings.length > 0 && (
        <div className="mb-4 space-y-2 p-3 rounded-xl" style={{ background: "rgba(255,160,0,0.08)", border: "1px solid rgba(255,160,0,0.2)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "#ffb347" }}>
            Warnings
          </span>
          {preview.warnings.map((w, i) => (
            <div key={i} className="text-[12px] font-semibold flex gap-2" style={{ color: "#ffcc77" }}>
              <span>⚠</span> <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-[12px] font-bold mb-3 text-center py-2 rounded-lg" style={{ color: "#ff6b6b", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-3 rounded-full text-[13px] font-bold transition-colors disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", border: "1px solid var(--card-border)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-full text-[13px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)", color: "#05080f" }}
        >
          {loading ? "Executing…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
