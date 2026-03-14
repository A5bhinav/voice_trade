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
    <div className="rounded-xl overflow-hidden w-full max-w-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: "var(--blue-dim)", color: "var(--blue-bright)", border: "1px solid rgba(61,127,255,0.25)" }}
        >
          {preview.type}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{preview.summary}</span>
      </div>

      <div className="space-y-2 mb-4">
        {Object.entries(preview.details ?? {}).map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between items-center px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <span className="capitalize text-[11px] font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {k.replace(/_/g, " ")}
            </span>
            <span className="text-[12px] font-semibold font-mono" style={{ color: "var(--text)" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className="mx-4 mb-3 rounded-lg px-3 py-2.5 space-y-1" style={{ background: "var(--amber-dim)", border: "1px solid rgba(240,174,48,0.25)" }}>
          <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: "var(--amber)" }}>Warnings</span>
          {preview.warnings.map((w, i) => (
            <div key={i} className="text-[11px] font-medium flex gap-1.5" style={{ color: "var(--amber)" }}>
              <span>&#9888;</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mx-4 mb-3 rounded-lg px-3 py-2 text-[11px] font-medium text-center"
          style={{ background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(240,69,69,0.25)" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
          Cancel
        </button>
        <button onClick={handleConfirm} disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--blue)", color: "#fff", boxShadow: "0 2px 10px rgba(61,127,255,0.3)" }}>
          {loading ? "Executing\u2026" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
